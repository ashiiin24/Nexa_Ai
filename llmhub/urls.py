from django.urls import path

from . import views


urlpatterns = [
    path("", views.home, name="home"),
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("logout/", views.logout_view, name="logout"),
    path("api/providers/", views.providers_api, name="providers_api"),
    path("api/ask/", views.ask_api, name="ask_api"),
]
