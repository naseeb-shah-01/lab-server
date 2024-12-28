export const throwError = (status, error?: string, errorCode?: string) => {
    throw {
        status: status,
        ...(error ? { error: error } : {}),
        ...(errorCode ? { errorCode: errorCode } : {}),
    };
}