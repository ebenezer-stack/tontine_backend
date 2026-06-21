import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export class TontineController {
  public static async index(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const status = req.query.status as string;

      const whereClause: any = { user_id: user.id };
      if (status) whereClause.status = status;

      const memberTontines = await prisma.members.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
      });

      const tontineIds = memberTontines.map(m => m.tontine_id);
      const tontines = await prisma.tontines.findMany({ where: { id: { in: tontineIds } } });
      const creators = await prisma.users.findMany({ where: { id: { in: tontines.map(t => t.creator_id) } } });

      const formattedTontines = memberTontines.map(m => {
        const t = tontines.find(t => t.id === m.tontine_id);
        const c = creators.find(c => c.id === t?.creator_id);
        return { ...t, creator: c };
      });

      res.json({ success: true, data: { current_page: 1, data: formattedTontines, total: formattedTontines.length } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async store(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const schema = z.object({
        name: z.string().max(255),
        description: z.string().optional().nullable(),
        contribution_amount: z.number().min(0.01),
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        member_count: z.number().min(2).max(100),
        start_date: z.string(),
        payout_order: z.enum(['manual', 'random', 'sequential']).optional().default('sequential'),
        item_price: z.number().min(0).optional().default(500000),
      });

      const validated = schema.parse(req.body);
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const tontine = await prisma.tontines.create({
        data: {
          creator_id: user.id,
          name: validated.name,
          description: validated.description,
          item_price: validated.item_price,
          contribution_amount: validated.contribution_amount,
          frequency: validated.frequency,
          member_count: validated.member_count,
          start_date: new Date(validated.start_date),
          payout_order: validated.payout_order as any,
          status: 'pending',
          code: code,
          created_at: new Date(),
        },
      });

      // Create N invitations (all spots available)
      const invitations = [];
      for(let i=0; i<validated.member_count; i++) {
        invitations.push({
          tontine_id: tontine.id,
          code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          is_used: false,
          created_at: new Date(),
        });
      }
      await prisma.tontine_invitations.createMany({ data: invitations });

      // Add creator as Admin (Owner) to the members table but without contributing obligations
      await prisma.members.create({
        data: { 
          tontine_id: tontine.id, 
          user_id: user.id, 
          role: 'admin', 
          status: 'active', 
          joined_at: new Date(), 
          created_at: new Date() 
        },
      });

      res.status(201).json({ success: true, message: 'Tontine créée avec succès !', data: tontine });
    } catch (error: any) { res.status(400).json({ success: false, message: error.errors || error.message }); }
  }

  public static async show(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);

      const tontine = await prisma.tontines.findUnique({ where: { id: tontineId } });
      if (!tontine) { res.status(404).json({ success: false, message: 'Introuvable.' }); return; }

      const isMember = await prisma.members.findFirst({ where: { tontine_id: tontineId, user_id: user.id } });
      const isAdmin = tontine.creator_id === user.id;

      if (!isMember && !isAdmin) { res.status(403).json({ success: false, message: 'Accès non autorisé.' }); return; }

      const creator = await prisma.users.findUnique({ where: { id: tontine.creator_id } });
      const members = await prisma.members.findMany({ where: { tontine_id: tontineId } });
      const users = await prisma.users.findMany({ where: { id: { in: members.map(m => m.user_id) } } });
      const contributions = await prisma.contributions.findMany({ where: { tontine_id: tontineId } });
      const payouts = await prisma.payouts.findMany({ where: { tontine_id: tontineId } });

      let invitations: any[] = [];
      if (isAdmin) {
        const invs = await prisma.tontine_invitations.findMany({ where: { tontine_id: tontineId } });
        const usedByUserIds = invs.filter(i => i.used_by_user_id).map(i => i.used_by_user_id) as bigint[];
        let usedByUsers: any[] = [];
        if (usedByUserIds.length > 0) {
          usedByUsers = await prisma.users.findMany({ where: { id: { in: usedByUserIds } } });
        }
        
        invitations = invs.map(i => {
          const user = usedByUsers.find(u => u.id === i.used_by_user_id);
          return { ...i, used_by_name: user ? (user.name || user.phone) : null };
        });
      }

      const formattedMembers = members.map(m => {
        const u = users.find(u => u.id === m.user_id);
        return { ...m, users: u };
      });

      res.json({ success: true, data: { ...tontine, users: creator, members: formattedMembers, contributions, payouts, invitations } });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);

      const tontine = await prisma.tontines.findUnique({ where: { id: tontineId } });
      if (!tontine || tontine.creator_id !== user.id) { res.status(403).json({ success: false, message: 'Non autorisé.' }); return; }

      const schema = z.object({ 
        name: z.string().optional(), 
        description: z.string().optional(),
        member_count: z.number().min(2).max(100).optional()
      });
      const validated = schema.parse(req.body);

      if (validated.member_count !== undefined && validated.member_count !== tontine.member_count) {
        if (tontine.status !== 'pending') {
          res.status(400).json({ success: false, message: 'Impossible de modifier le nombre de places après le démarrage.' });
          return;
        }

        const usedInvitationsCount = await prisma.tontine_invitations.count({
          where: { tontine_id: tontineId, is_used: true }
        });

        if (validated.member_count < usedInvitationsCount) {
          res.status(400).json({ success: false, message: 'Impossible de réduire en dessous du nombre de membres actuels.' });
          return;
        }

        const difference = validated.member_count - tontine.member_count;

        if (difference > 0) {
          // Ajouter de nouveaux codes
          const invitations = [];
          for(let i=0; i<difference; i++) {
            invitations.push({
              tontine_id: tontine.id,
              code: Math.random().toString(36).substring(2, 10).toUpperCase(),
              is_used: false,
              created_at: new Date(),
            });
          }
          await prisma.tontine_invitations.createMany({ data: invitations });
        } else if (difference < 0) {
          // Retirer des codes non utilisés
          const unusedInvitations = await prisma.tontine_invitations.findMany({
            where: { tontine_id: tontineId, is_used: false },
            take: Math.abs(difference)
          });
          
          await prisma.tontine_invitations.deleteMany({
            where: { id: { in: unusedInvitations.map(inv => inv.id) } }
          });
        }
      }

      const updated = await prisma.tontines.update({ where: { id: tontineId }, data: validated });
      res.json({ success: true, message: 'Tontine mise à jour.', data: updated });
    } catch (error: any) { res.status(400).json({ success: false, message: error.errors || error.message }); }
  }

  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);

      const tontine = await prisma.tontines.findUnique({ where: { id: tontineId } });
      if (!tontine || tontine.creator_id !== user.id) { res.status(403).json({ success: false, message: 'Non autorisé.' }); return; }
      if (tontine.status !== 'pending') { res.status(400).json({ success: false, message: 'Impossible de supprimer une tontine démarrée.' }); return; }

      await prisma.members.deleteMany({ where: { tontine_id: tontineId } });
      await prisma.tontines.delete({ where: { id: tontineId } });

      res.json({ success: true, message: 'Tontine supprimée avec succès.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async activate(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);

      const tontine = await prisma.tontines.findUnique({ where: { id: tontineId } });
      if (!tontine || tontine.creator_id !== user.id) { res.status(403).json({ success: false, message: 'Accès non autorisé.' }); return; }

      if (tontine.status !== 'pending') {
        res.status(400).json({ success: false, message: 'Cette tontine est déjà active ou terminée.' });
        return;
      }

      // Fetch only regular members (excluding the admin/owner)
      const members = await prisma.members.findMany({
        where: { 
          tontine_id: tontineId,
          role: 'member' // Admin is excluded from payouts
        }
      });

      if (members.length < 2) {
        res.status(400).json({ success: false, message: 'Impossible de démarrer une tontine avec moins de deux membres contributeurs.' });
        return;
      }

      let orderedMembers = [...members];

      if (tontine.payout_order === 'sequential' || tontine.payout_order === 'manual') {
        // Sort by joined_at ascending
        orderedMembers.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
      } else if (tontine.payout_order === 'random') {
        // Fisher-Yates shuffle
        for (let i = orderedMembers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [orderedMembers[i], orderedMembers[j]] = [orderedMembers[j], orderedMembers[i]];
        }
      }

      // Update payout_order in database for each member
      const updatePromises = orderedMembers.map((member, index) => 
        prisma.members.update({
          where: { id: member.id },
          data: { payout_order: index + 1 }
        })
      );
      await Promise.all(updatePromises);

      await prisma.tontines.update({ where: { id: tontineId }, data: { status: 'active' } });
      res.json({ success: true, message: "Tontine démarrée avec succès et ordre d'attribution généré !" });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);

      const tontine = await prisma.tontines.findUnique({ where: { id: tontineId } });
      const isMember = await prisma.members.findFirst({ where: { tontine_id: tontineId, user_id: user.id } });
      
      if (!isMember && tontine?.creator_id !== user.id) { res.status(403).json({ success: false, message: 'Accès non autorisé.' }); return; }

      const members = await prisma.members.findMany({ where: { tontine_id: tontineId } });
      const users = await prisma.users.findMany({ where: { id: { in: members.map(m => m.user_id) } } });

      const formatted = members.map(m => {
        const u = users.find(u => u.id === m.user_id);
        return {
          id: u?.id, name: u?.name, phone: u?.phone, avatar_url: u?.avatar_url,
          role: m.role, status: m.status, joined_at: m.joined_at, has_received_item: m.has_received_item,
          trust_score: m.trust_score, total_contributed: m.total_contributed, total_penalties: m.total_penalties, payout_order: m.payout_order,
        };
      });

      res.json({ success: true, data: formatted });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async joinByCode(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const code = req.body.code;
      
      const invitation = await prisma.tontine_invitations.findUnique({ where: { code } });
      
      if (!invitation) { 
        res.status(404).json({ success: false, message: 'Code invalide.' }); 
        return; 
      }
      
      if (invitation.is_used) {
        res.status(400).json({ success: false, message: 'Ce code d\'invitation a déjà été utilisé.' }); 
        return;
      }

      const tontine = await prisma.tontines.findUnique({ where: { id: invitation.tontine_id } });
      if (!tontine) {
        res.status(404).json({ success: false, message: 'Tontine introuvable.' }); 
        return;
      }

      if (tontine.status !== 'pending') {
        res.status(400).json({ success: false, message: 'Ce groupe a déjà démarré. Vous ne pouvez plus le rejoindre.' });
        return;
      }

      const exists = await prisma.members.findFirst({ where: { tontine_id: tontine.id, user_id: user.id }});
      
      if (exists) { 
        // If it's the admin trying to become a contributor
        if (tontine.creator_id === user.id && exists.role === 'admin') {
          // Allow them to use the code to become a contributor ('member')
          await prisma.tontine_invitations.update({
            where: { id: invitation.id },
            data: { is_used: true, used_by_user_id: user.id }
          });

          await prisma.members.update({
            where: { id: exists.id },
            data: { role: 'member' }
          });

          res.json({ success: true, message: 'Vous avez rejoint le groupe en tant que contributeur avec succès !' });
          return;
        } else {
          res.status(400).json({ success: false, message: 'Vous êtes déjà membre de ce groupe.' }); 
          return; 
        }
      }

      // Mark code as used
      await prisma.tontine_invitations.update({
        where: { id: invitation.id },
        data: { is_used: true, used_by_user_id: user.id }
      });

      // Add to members as regular contributor
      await prisma.members.create({ 
        data: { 
          tontine_id: tontine.id, 
          user_id: user.id, 
          role: 'member',
          status: 'active',
          joined_at: new Date() 
        } 
      });

      res.json({ success: true, message: 'Vous avez rejoint le groupe avec succès !' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async leave(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const tontineId = BigInt(req.params.tontine);
      const member = await prisma.members.findFirst({ where: { tontine_id: tontineId, user_id: user.id } });
      if (!member) { res.status(400).json({ success: false, message: "Vous n'êtes pas membre." }); return; }
      if (member.role === 'admin') { res.status(400).json({ success: false, message: 'Admin ne peut pas quitter.' }); return; }

      await prisma.members.delete({ where: { id: member.id } });
      res.json({ success: true, message: 'Vous avez quitté la tontine.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async reorderMembers(req: Request, res: Response): Promise<void> {
    try {
      const tontineId = BigInt(req.params.tontine);
      const orders = req.body.orders as { user_id: number, order: number }[];
      // Logic for reordering
      for (const o of orders) {
        const mem = await prisma.members.findFirst({ where: { tontine_id: tontineId, user_id: BigInt(o.user_id) } });
        if (mem) await prisma.members.update({ where: { id: mem.id }, data: { payout_order: o.order } });
      }
      res.json({ success: true, message: 'Ordre mis à jour.' });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
  }

  public static async inviteMember(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Invitation envoyée (MOCK).' });
  }

  public static async restart(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Cycle redémarré (MOCK).' });
  }

  public static async completePayout(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Décaissement validé (MOCK).' });
  }

  public static async generateContract(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Contrat généré (MOCK).' });
  }
}
