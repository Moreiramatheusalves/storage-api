import { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../errors/app.error';
import { FileNotFoundError } from '../errors/file-not-found.error';

function logControlledError(error: unknown): void {
    const candidate = error as NodeJS.ErrnoException;
    console.error('[HTTP_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
        code:
            error instanceof FileNotFoundError
                ? error.code
                : typeof candidate?.code === 'string'
                  ? candidate.code
                  : undefined,
        statusCode: error instanceof AppError ? error.statusCode : 500
    });
}

export const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, next) => {
    logControlledError(error);

    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof multer.MulterError) {
        const message =
            error.code === 'LIMIT_FILE_SIZE'
                ? 'Arquivo excede o tamanho máximo permitido.'
                : error.message;

        return res.status(400).json({
            success: false,
            message
        });
    }

    if (error instanceof FileNotFoundError) {
        return res.status(error.statusCode).json({
            error: {
                code: error.code,
                message: error.message
            }
        });
    }

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            ...(error.details ? { details: error.details } : {})
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor.'
    });
};
