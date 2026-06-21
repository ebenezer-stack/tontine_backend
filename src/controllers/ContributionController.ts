import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export class ContributionController {
  public static async index(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);
      const status = req.query.status as string;
      const userId = req.query.user_id ? BigInt(req.query.user_id as string) : undefined;

      const isMember = await prisma.members.findFirst({ where: { tontine_id: tontineId, user_id: user.id } });
      if (!isMember) { res.status(403).json({ success: false, message: 'Accès non autorisé.' }); return; }

      const whereClause: any = { tontine_id: tontineId };
      if (status) whereClause.status = status;
      if (userId) whereClause.user_id = userId;

      const contributions = await prisma.contributions.findMany({
        where: whereClause,
        orderBy: { due_date: 'desc' },
      });

      const users = await prisma.users.findMany({ where: { id: { in: contributions.map(c => c.user_id) } } });
      
      const formatted = contributions.map(c => {
        const u = users.find(u => u.id === c.user_id);
        return { ...c, users: u };
      });

      res.json({ success: true, data: { data: formatted } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async store(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Enregistrement manuel via store (MOCK)' });
  }

  public static async pay(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);
      const schema = z.object({ amount: z.coerce.number().min(1), method: z.string(), reference: z.string().optional().nullable() });
      const validated = schema.parse(req.body);

      const contribution = await prisma.contributions.create({
        data: {
          tontine_id: tontineId, user_id: user.id, amount: validated.amount, status: 'paid',
          paid_date: new Date(), due_date: new Date(), payment_method: validated.method, reference: validated.reference,
        },
      });
      res.json({ success: true, data: contribution });
    } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
  }

  public static async summary(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { total: 0 } });
  }

  public static async lateContributions(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  public static async pendingPayments(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  public static async history(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const history = await prisma.contributions.findMany({ where: { user_id: user.id, status: 'paid' }, orderBy: { paid_date: 'desc' }});
    res.json({ success: true, data: history });
  }

  public static async verifyPayment(req: Request, res: Response): Promise<void> {
    res.json({ success: true, status: 'completed' });
  }

  public static async verifyFedaPayPayment(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { status: 'approved' } });
  }

  public static async approve(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Approved' });
  }

  public static async reject(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Rejected' });
  }

  public static async fedapayWebhook(req: Request, res: Response): Promise<void> {
    res.json({ success: true });
  }
}
