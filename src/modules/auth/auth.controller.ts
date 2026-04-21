import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthService } from './auth.service';
import {
  ListApiKeysInput,
  RegisterAppInput,
  RegenerateApiKeyInput,
  RevokeApiKeyInput
} from './auth.schema';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(req: Request, res: Response) {
    const result = await this.authService.registerApp(req.body as RegisterAppInput);
    res.status(StatusCodes.CREATED).json(result);
  }

  async listApiKeys(req: Request, res: Response) {
    const apiKeys = await this.authService.listApiKeys(req.query as ListApiKeysInput);
    res.status(StatusCodes.OK).json({ apiKeys });
  }

  async revoke(req: Request, res: Response) {
    const apiKey = await this.authService.revokeApiKey(req.body as RevokeApiKeyInput);
    res.status(StatusCodes.OK).json({ apiKey });
  }

  async regenerate(req: Request, res: Response) {
    const result = await this.authService.regenerateApiKey(req.body as RegenerateApiKeyInput);
    res.status(StatusCodes.OK).json(result);
  }
}
