
export type Omega<Instance> = {
    hasInitialized(): boolean;
    get(): Instance;
    set(instance: Instance): Omega<Instance>;
    setup(createInstance: () => Instance): Omega<Instance>;
    redirect(redirectInstance: (() => Instance) | null): Omega<Instance>;
} & (() => Instance);

export class OmegaError extends Error {
    // @empty:
}

function innerOmega<Instance>(
    instance?: Instance,
    createInstance?: () => Instance,
    redirect?: () => Instance
): Omega<Instance> {
    let _instance = instance;
    let _createInstance = createInstance;
    let _redirect = redirect;

    const omegaWrapper: Omega<Instance> = () => {
        if (_redirect) {
            return _redirect();
        }

        if (typeof _instance !== 'undefined') {
            return _instance;
        }

        if (!_createInstance) {
            throw new Error('缺少必要的 createInstance 或 redirect 设置, 或者你忘了 set instance ?');
        }

        _instance = _createInstance();
        if (typeof _instance === 'undefined') {
            throw new Error('createInstance 不应该返回 undefined');
        }

        return _instance;
    };

    omegaWrapper.hasInitialized = () => {
        return typeof _instance !== 'undefined';
    };

    omegaWrapper.get = () => {
        return omegaWrapper();
    };

    omegaWrapper.redirect = (redirect: () => Instance) => {
        _redirect = redirect;
        return omegaWrapper;
    };

    omegaWrapper.setup = (createInstance: () => Instance) => {
        if (omegaWrapper.hasInitialized()) {
            throw new OmegaError('omega setup 的时候不应该被实例化过');
        }
        _createInstance = createInstance;
        return omegaWrapper;
    };

    omegaWrapper.set = (instance: Instance) => {
        _instance = instance;
        return omegaWrapper;
    };

    return omegaWrapper;
}

export function omega<Instance>(instance?: Instance | (() => Instance)): Omega<Instance> {
    const instanceType = typeof instance;

    if (instanceType === 'function') {
        return innerOmega(
            undefined,
            instance as () => Instance
        );
    }

    return innerOmega(
        instance as Instance
    );
}
