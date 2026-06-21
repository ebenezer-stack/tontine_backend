import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export class KycController {
  public static async upload(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const idCardFile = files['id_card'] ? files['id_card'][0] : null;
      const selfieFile = files['selfie'] ? files['selfie'][0] : null;

      if (!idCardFile || !selfieFile) {
        res.status(400).json({ success: false, message: 'Les fichiers id_card et selfie sont requis.' });
        return;
      }

      const host = req.protocol + '://' + req.get('host');
      const idCardUrl = `${host}/storage/kyc/documents/${idCardFile.filename}`;
      const selfieUrl = `${host}/storage/kyc/selfies/${selfieFile.filename}`;

      await prisma.users.update({
        where: { id: user.id },
        data: {
          kyc_document_url: idCardUrl,
          kyc_selfie_url: selfieUrl,
          kyc_status: 'pending',
        },
      });

      res.json({
        success: true,
        message: 'Documents KYC téléchargés avec succès et en attente de vérification.',
        kyc_status: 'pending',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async status(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        kyc_status: user.kyc_status,
        kyc_verified_at: user.kyc_verified_at,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async verify(req: Request, res: Response): Promise<void> {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Non autorisé.' });
        return;
      }

      const schema = z.object({
        status: z.enum(['verified', 'rejected']),
        rejection_reason: z.string().optional(),
      });

      const validated = schema.parse(req.body);
      const userId = BigInt(req.params.user);

      await prisma.users.update({
        where: { id: userId },
        data: {
          kyc_status: validated.status,
          kyc_verified_at: validated.status === 'verified' ? new Date() : null,
        },
      });

      res.json({
        success: true,
        message: `Statut KYC mis à jour à ${validated.status}.`,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
