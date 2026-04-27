import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects, ZodTypeAny } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject> | ZodTypeAny;

export function validateRequest(schema: Schema, target: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      Object.defineProperty(req, target, {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
