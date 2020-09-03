exports.setRoot = function setRoot(router: any, controller: any, authUtils: any) {
  router.route('/')
    .get((...args: any) => controller.find(...args))
    .post(authUtils.ensureAuthenticated, (...args: any) => controller.create(...args))
    .delete(authUtils.ensureAuthenticated, (...args: any) => controller.deleteMany(...args));
};
