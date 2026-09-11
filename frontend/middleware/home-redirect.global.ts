export default defineNuxtRouteMiddleware(to => {
  if (to.path === "/home") {
    return navigateTo("/locations", { replace: true });
  }
});
