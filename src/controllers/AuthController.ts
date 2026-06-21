import { Request, Response } from 'express';
import { prisma } from '../index';
import { OtpService } from '../services/OtpService';
import { generateToken } from '../utils/jwt';
import { z } from 'zod';

const otpService = new OtpService();

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        phone: z.string().min(8),
        name: z.string().max(255),
      });

      const validated = schema.parse(req.body);
      const normalizedPhone = validated.phone.replace(/[^0-9]/g, '');

      const existingUser = await prisma.users.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Ce numéro de téléphone est déjà inscrit. Veuillez vous connecter.',
        });
        return;
      }

      await prisma.users.create({
        data: {
          phone: normalizedPhone,
          name: validated.name,
        },
      });

      const otpResult = await otpService.sendOtp(normalizedPhone);

      res.json({
        success: true,
        message: 'Inscription réussie. Code OTP envoyé.',
        expires_in: otpResult.expires_in,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.errors || error.message });
    }
  }

  public static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        phone: z.string(),
        otp_code: z.string(),
      });

      const validated = schema.parse(req.body);
      const normalizedPhone = validated.phone.replace(/[^0-9]/g, '');

      const verification = await otpService.verifyOtp(validated.phone, validated.otp_code);

      if (!verification.success) {
        res.status(401).json(verification);
        return;
      }

      const user = await prisma.users.findFirst({
        where: {
          OR: [{ phone: normalizedPhone }, { phone: validated.phone }],
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Numéro de téléphone introuvable.',
        });
        return;
      }

      if (!user.verified_at) {
        await prisma.users.update({
          where: { id: user.id },
          data: { verified_at: new Date() },
        });
      }

      const token = generateToken({ userId: user.id.toString(), role: user.role });

      res.json({
        success: true,
        message: 'Connexion réussie.',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            avatar_url: user.avatar_url,
            verified: !!user.verified_at,
            kyc_status: user.kyc_status,
            role: user.role,
          },
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.errors || error.message });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        phone: z.string(),
      });

      const validated = schema.parse(req.body);
      const normalizedPhone = validated.phone.replace(/[^0-9]/g, '');

      const user = await prisma.users.findFirst({
        where: {
          OR: [{ phone: normalizedPhone }, { phone: validated.phone }],
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: "Ce numéro de téléphone n'est pas inscrit. Veuillez créer un compte.",
        });
        return;
      }

      const otpResult = await otpService.sendOtp(normalizedPhone);

      res.json({
        success: true,
        message: 'Code OTP envoyé pour la connexion.',
        expires_in: otpResult.expires_in,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.errors || error.message });
    }
  }

  public static async user(req: Request, res: Response): Promise<void> {
    try {
      // User is injected by authMiddleware
      const user = (req as any).user;

      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          avatar_url: user.avatar_url,
          verified: !!user.verified_at,
          kyc_status: user.kyc_status,
          role: user.role,
          // TODO: Add these aggregations
          reliability_score: 100, 
          total_contributed: 0,
          active_tontines: 0,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    // With standard JWT, we can't really "delete" it from the server side without a blacklist.
    // Client simply removes the token.
    res.json({
      success: true,
      message: 'Déconnexion réussie.',
    });
  }

  public static async resendOtp(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        phone: z.string(),
      });

      const validated = schema.parse(req.body);
      const otpResult = await otpService.sendOtp(validated.phone);

      res.status(otpResult.success ? 200 : 400).json(otpResult);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.errors || error.message });
    }
  }
}
