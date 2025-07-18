from django.urls import path
from . import views

urlpatterns = [
    path('predict/', views.PredictGestureView.as_view(), name='predict-gesture'),
] 