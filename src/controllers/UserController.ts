import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

export class UserController {
  public static async profile(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    res.json({
      success: true,
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
    });
  }

  public static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      const schema = z.object({
        name: z.string().max(255).optional(),
        phone: z.string().optional(),
        email: z.string().email().or(z.literal('')).optional().nullable(),
      });

      const validated = schema.parse(req.body);

      if (validated.phone && validated.phone !== user.phone) {
        const existing = await prisma.users.findUnique({ where: { phone: validated.phone } });
        if (existing) {
          res.status(400).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé.' });
          return;
        }
      }

      if (validated.email && validated.email !== user.email) {
        const existing = await prisma.users.findUnique({ where: { email: validated.email } });
        if (existing) {
          res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
          return;
        }
      }

      let avatarUrl = user.avatar_url;
      if (req.file) {
        const host = req.protocol + '://' + req.get('host');
        avatarUrl = `${host}/storage/avatars/${req.file.filename}`;
      }

      const updatedUser = await prisma.users.update({
        where: { id: user.id },
        data: {
          name: validated.name || user.name,
          phone: validated.phone || user.phone,
          email: validated.email === '' ? null : (validated.email !== undefined ? validated.email : user.email),
          avatar_url: avatarUrl,
        },
      });

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès.',
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          phone: updatedUser.phone,
          email: updatedUser.email,
          avatar_url: updatedUser.avatar_url,
          verified: !!updatedUser.verified_at,
          kyc_status: updatedUser.kyc_status,
          role: updatedUser.role,
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.errors || error.message });
    }
  }

  public static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
        return;
      }

      const host = req.protocol + '://' + req.get('host');
      const avatarUrl = `${host}/storage/avatars/${req.file.filename}`;

      await prisma.users.update({
        where: { id: user.id },
        data: { avatar_url: avatarUrl },
      });

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès.',
        avatar_url: avatarUrl,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erreur lors du téléchargement.' });
    }
  }

  public static async myTontines(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const status = req.query.status as string;

      // 1. Fetch tontines where user is a member
      const memberTontines = await prisma.members.findMany({
        where: { user_id: user.id },
      });
      const tontineIdsFromMembers = memberTontines.map(m => m.tontine_id);

      // 2. Fetch all relevant tontines (either member or creator)
      let tontinesWhere: any = {
        OR: [
          { id: { in: tontineIdsFromMembers } },
          { creator_id: user.id }
        ]
      };

      if (status) { 
        // Si le frontend filtre par statut ('active', 'pending')
        tontinesWhere.status = status; 
      }

      const tontines = await prisma.tontines.findMany({ 
        where: tontinesWhere,
        orderBy: { created_at: 'desc' }
      });

      const creators = await prisma.users.findMany({ 
        where: { id: { in: tontines.map(t => t.creator_id) } } 
      });

      const formattedTontines = tontines.map(t => {
        const creator = creators.find(c => c.id === t.creator_id);
        const m = memberTontines.find(member => member.tontine_id === t.id);
        
        return {
          ...t,
          creator: creator,
          pivot: m ? {
            status: m.status,
            role: m.role,
            joined_at: m.joined_at,
            has_received_item: m.has_received_item,
          } : {
            // Faux pivot pour que Flutter ne plante pas : il est l'admin créateur
            status: 'active',
            role: 'admin',
            joined_at: t.created_at,
            has_received_item: false,
          }
        };
      });

      res.json({
        success: true,
        data: { current_page: 1, data: formattedTontines, total: formattedTontines.length },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async notifications(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const unread = req.query.unread === 'true';

      const whereClause: any = { user_id: user.id };
      if (unread) { whereClause.read_at = null; }

      const notifications = await prisma.notifications.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        data: { current_page: 1, data: notifications, total: notifications.length },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const notificationId = BigInt(req.params.notificationId);

      const notification = await prisma.notifications.findFirst({
        where: { id: notificationId, user_id: user.id },
      });

      if (!notification) { res.status(404).json({ success: false, message: 'Introuvable.' }); return; }

      await prisma.notifications.update({
        where: { id: notificationId },
        data: { read_at: new Date() },
      });

      res.json({ success: true, message: 'Notification marquée comme lue.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async markAllNotificationsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      await prisma.notifications.updateMany({
        where: { user_id: user.id, read_at: null },
        data: { read_at: new Date() },
      });

      res.json({ success: true, message: 'Toutes marquées comme lues.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async unreadNotificationsCount(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const count = await prisma.notifications.count({
        where: { user_id: user.id, read_at: null },
      });

      res.json({ success: true, unread_count: count });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
