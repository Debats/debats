export const makeCancelable = (promise) => {
  let hasCanceled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then((val) =>
      (hasCanceled ? null : resolve(val))
    );
    promise.catch(reject);
  });

  return {
    promise: wrappedPromise,
    cancel() {
      hasCanceled = true;
    },
  };
};

// (inspired by @istarkov) Sources :
// https://github.com/facebook/react/issues/5465#issuecomment-157888325
// https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
