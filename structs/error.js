function createError(errorCode, errorMessage, messageVars, numericErrorCode, error) {
    return {
        errorCode: errorCode,
        errorMessage: errorMessage,
        messageVars: messageVars,
        numericErrorCode: numericErrorCode,
        originatingService: "any",
        intent: "prod",
        error_description: errorMessage,
        error: error
    };
}

module.exports = {
    createError
}