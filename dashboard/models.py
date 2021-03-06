from django.contrib.gis.db import models
from model_utils.managers import InheritanceManager
from django.template.defaultfilters import slugify
from django.db.models.signals import m2m_changed
from django.contrib.auth.models import User, Group
from datetime import datetime
from django.db.models.fields import FieldDoesNotExist

from south.modelsinspector import add_introspection_rules
add_introspection_rules([], ["^django\.contrib\.gis\.db\.models\.fields\.GeometryField"])


# Create your models here.

def get_field_value(instance, field):
    try:
        field = instance._meta.get_field(field)
        field_type = field.get_internal_type()
        value = getattr(instance, field)

        if field_type == 'DateTimeField':
            value = value.strftime('%m/%d/%Y-%H:%M:%S') if value else None
        elif field_type == 'GeometryField':
            value = value.wkt if value else None
        elif field_type == 'ForeignKey':
            value = value.id if value else None

        return value
    except:
        print 'Warning: trying to get an unknown field %s from %s' % (field, instance)
        return None


def get_model_attr(instance):
    attr = {'primary': {}, 'meta': {}, 'other': {}}
    # these fields are special
    meta_attr = ['id', 'created_by', 'created_at', 'last_edited_by', 'last_edited_at']
    excludes = ['attributes', 'entity_ptr', 'case', 'group'] + meta_attr
    primary = attr['primary']
    for field_name in instance._meta.get_all_field_names():
        if field_name in excludes: continue
        primary[field_name] = get_field_value(instance, field_name)

    meta = attr['meta']
    for field in meta_attr:
        meta[field] = get_field_value(instance, field)

    other = attr['other']

    for a in instance.attributes.all():
        other[a.attr] = a.val

    return attr


class Case(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    groups = models.ManyToManyField(Group, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.GeometryField(null=True, blank=True)

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name


class Attribute(models.Model):
    attr = models.CharField(max_length=255)
    val  = models.CharField(max_length=255)

    class Meta:
        unique_together = (("attr", "val"),)

    def __unicode__(self):
        return self.attr + ' : ' + self.val



class Entity(models.Model):
    name          = models.CharField(max_length=1000)
    priority      = models.FloatField(default=5, null=True, blank=True)  # ranging from 0-9
    entity_type    = models.CharField(max_length=50, blank=True)
    note          = models.TextField(blank=True)
    attributes    = models.ManyToManyField(Attribute, blank=True, null=True)
    created_by     = models.ForeignKey(User, null=True, blank=True, verbose_name='created by', related_name='created_entities')
    created_at     = models.DateTimeField(auto_now_add=True, verbose_name='created at')
    last_edited_by = models.ForeignKey(User, null=True, blank=True, related_name='edited_entities')
    last_edited_at = models.DateTimeField(auto_now=True)
    group         = models.ForeignKey(Group)
    case          = models.ForeignKey(Case)

    objects = InheritanceManager()

    def __unicode__(self):
        return self.name

    def findTargets(self):
        res = []
        targets_id = list(Relationship.objects.filter(source=self).values_list("target"))
        for tar in targets_id:
            res.append(tar[0])
        return Entity.objects.filter(id__in=res).select_subclasses()

    def findSources(self):
        res = []
        sources_id = list(Relationship.objects.filter(target=self).values_list("source"))
        for sou in sources_id:
            res.append(sou[0])
        return Entity.objects.filter(id__in=res).select_subclasses()

    def get_attr(self):
        return get_model_attr(self)


class Dataset(models.Model):
    name = models.CharField(max_length=500)
    case = models.ForeignKey(Case)
    created_by = models.ForeignKey(User, null=True, blank=True, verbose_name='created by')
    created_at  = models.DateTimeField(auto_now_add=True, verbose_name='created at')

    def get_attr(self):
        attr = {}
        attr['id'] = self.id
        attr['name'] = self.name
        attr['created_by'] = self.created_by.username if self.created_by != None else None
        attr['created_at'] = self.created_at.strftime('%m/%d/%Y') if self.created_at else None
        attr['entries'] = self.dataentry_set.count()
        return attr

    def __unicode__(self):
        return self.name



class DataEntry(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    content = models.TextField()
    date  = models.DateTimeField(null=True, blank=True)
    dataset = models.ForeignKey(Dataset, null=True, blank=True)

    def get_attr(self):
        attr = {}
        attr['id'] = self.id
        attr['content'] = self.content
        attr['dataset'] = self.dataset.id
        attr['date']    = ''
        if self.date != None:
            attr['date']  = self.date.strftime('%m/%d/%Y-%H:%M:%S')
        return attr


class Location(Entity):
    geometry = models.GeometryField(null=True, blank=True)
    address = models.CharField(max_length=500, blank=True)
    precision = models.FloatField(null=True, blank=True, help_text='in meter')

    objects = models.GeoManager()

    def _get_geom_type(self):
        return self.location.geom_type

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'location'
        super(Location, self).save(*args, **kwargs)



class Person(Entity):
    gender       = models.CharField(max_length=10, null=True, blank=True)
    nationality  = models.CharField(max_length=50, null=True, blank=True)
    alias        = models.ForeignKey('self', null=True, blank=True)  # TODO: the person could be an alias to another person
    ethnicity    = models.CharField(max_length=50, null=True, blank=True)
    race         = models.CharField(max_length=10, null=True, blank=True)
    religion     = models.CharField(max_length=50, null=True, blank=True)

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'person'
        super(Person, self).save(*args, **kwargs)



class Organization(Entity):
    people      = models.ManyToManyField(Person, null=True, blank=True)
    category    = models.CharField(max_length=100, null=True, blank=True, verbose_name='type')
    nationality = models.CharField(max_length=50, blank=True, null=True)
    ethnicity   = models.CharField(max_length=50, null=True, blank=True)
    religion    = models.CharField(max_length=50, null=True, blank=True)

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'organization'
        super(Organization, self).save(*args, **kwargs)



class Event(Entity):
    people       = models.ManyToManyField(Person, null=True, blank=True)
    location     = models.ForeignKey(Location, null=True, blank=True)
    category     = models.CharField(max_length=100, null=True, blank=True, verbose_name='type')
    start_date   = models.DateTimeField(null=True, blank=True)
    end_date     = models.DateTimeField(null=True, blank=True)
    repeat_days       = models.CommaSeparatedIntegerField(max_length=50, null=True, blank=True)  # 1 -7, stands for Mon - Sun

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'event'
        super(Event, self).save(*args, **kwargs)


class Resource(Entity):
    condition    = models.CharField(max_length=100, null=True, blank=True)
    availability = models.CharField(max_length=50, null=True, blank=True)
    category    = models.CharField(max_length=50, null=True, blank=True, verbose_name='type')

    objects = InheritanceManager()

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'resource'
        super(Resource, self).save(*args, **kwargs)



class Relationship(models.Model):
    source = models.ForeignKey(Entity, null=True, blank=True, related_name="relates_as_source") # trick here: if source is null, it is a "special" relationship, indicating that a dataentry 'contains' an entity
    target = models.ForeignKey(Entity, related_name="relates_as_target")
    note   = models.TextField(null=True, blank=True)
    relation  = models.CharField(max_length=500, blank=True)
    confidence  = models.FloatField(null=True, blank=True)
    priority    = models.FloatField(default=5, null=True, blank=True)  # priority defaults to 5, ranging from 0-9
    dataentry  = models.ForeignKey(DataEntry, null=True, blank=True)
    created_at   = models.DateTimeField(default=datetime.now, verbose_name='created at')
    created_by  = models.ForeignKey(User, null=True, blank=True, verbose_name='created by', related_name='created_relationships')
    last_edited_by  = models.ForeignKey(User, null=True, blank=True, verbose_name='edited by', related_name='edited_relationships')
    last_edited_at  = models.DateTimeField(auto_now=True)
    group      = models.ForeignKey(Group)
    case        = models.ForeignKey(Case)

    def __unicode__(self):
        return self.source.name + '-' + self.target.name

    def get_attr(self):
        return get_model_attr(self)

