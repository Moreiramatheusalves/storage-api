import { Request, Response } from 'express';
import { DiagnosticsService } from '../services/diagnostics.service';
import { asyncHandler } from '../utils/async-handler';

export class AdminDiagnosticsController {
    constructor(private readonly service = new DiagnosticsService()) { }

    show = asyncHandler(async (_req: Request, res: Response) => {
        const diagnostics = await this.service.getDiagnostics();

        res.setHeader('Cache-Control', 'no-store');

        res.json({
            success: true,
            data: diagnostics
        });
    });
}