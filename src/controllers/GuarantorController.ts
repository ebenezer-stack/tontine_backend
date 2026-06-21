import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export class GuarantorController {
  public static async index(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const guarantors = await prisma.guarantors.findMany({
        where: { user_id: user.id },
      });

      res.json({
        success: true,
        data: guarantors,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async store(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const schema = z.object({
        name: z.string().max(255),
        phone: z.string().max(20),
        address: z.string().optional().nullable(),
      });

      const validated = schema.parse(req.body);

      let idCardPath = null;
      if (req.file) {
        const host = req.protocol + '://' + req.get('host');
        idCardPath = `${host}/storage/guarantors_id_cards/${req.file.filename}`;
      }

      const guarantor = await prisma.guarantors.create({
        data: {
          user_id: user.id,
          name: validated.name,
          phone: validated.phone,
          address: validated.address,
          id_card_path: idCardPath,
        },
      });

      res.json({
        success: true,
        message: 'Garant ajouté avec succès',
        data: guarantor,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
