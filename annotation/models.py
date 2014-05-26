from django.db import models
from dashboard.models import Message, Entity
from django.contrib.auth.models import User
import datetime

# Create your models here.
class Annotation(models.Model):
    # temporary, for annotator library
    start	= models.CharField(max_length=200)
    end 	= models.CharField(max_length=200)
    # end temporary
    startOffset = models.IntegerField()
    endOffset   = models.IntegerField()
    message	= models.ForeignKey(Message)
    entities	= models.ManyToManyField(Entity)
    created_by  = models.ForeignKey(User, blank=True, null=True)
    created_at  = models.DateTimeField(default=datetime.datetime.now)

    def serialize(self):
        ann = {}
        ann['id']     = self.id
        ann['ranges'] = [{
            'start': self.start,
            'end'  : self.end,
            'startOffset': self.startOffset,
            'endOffset'  : self.endOffset
        }]
        ann['anchor']   = self.message.id
        ann['tags'] = []
        for ent in self.entities.all().select_subclasses():
            ann['tags'].append(ent.getKeyAttr())
        return ann

    def __unicode__(self):
        return self.entities.all()[0].name
