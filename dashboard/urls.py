from django.conf.urls import patterns, include, url
from views import *


# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    url(r'^$', index),
    url(r'^data$', getData),
    url(r'^entity/attributes$', entity_attr),
    url(r'^events/all$', queryEvent),
    url(r'^network$', prepareNetwork),
    url(r'^network/relation$', network_relation),
    # url(r'^$', 'eventviewer.views.home', name='home'),
    # url(r'^eventviewer/', include('eventviewer.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
    url(r'^workbench/', include('workbench.urls')),
    url(r'^annotation/', include('annotation.urls')),
    url(r'^account/', include('users.urls')),
    url(r'^logs/', include('activitylog.urls')),
)
