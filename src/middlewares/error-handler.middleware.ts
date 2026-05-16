import { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../errors/app.error';

export const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, next) => {
    console.error('[HTTP_ERROR]', error);

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