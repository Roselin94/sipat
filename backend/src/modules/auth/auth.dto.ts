import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'L’identifiant (email ou matricule) est requis'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Le jeton de rafraîchissement est requis'),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

