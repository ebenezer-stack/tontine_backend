import { Request, Response } from 'express';
import { prisma } from '../index';

export class DashboardController {
  public static async index(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      const activeTontines = await prisma.members.count({
        where: { user_id: user.id, status: 'active' },
      });

      const totalContributedResult = await prisma.members.aggregate({
        where: { user_id: user.id },
        _sum: { total_contributed: true },
      });
      const totalContributed = Number(totalContributedResult._sum.total_contributed || 0);

      const recentNotifications = await prisma.notifications.findMany({
        where: { user_id: user.id, read_at: null },
        orderBy: { created_at: 'desc' },
        take: 5,
      });

      const totalReceivedResult = await prisma.payouts.aggregate({
        where: { beneficiary_id: user.id, status: 'completed' },
        _sum: { amount: true },
      });
      const totalReceived = Number(totalReceivedResult._sum.amount || 0);

      const yieldPercent = totalContributed > 0 ? ((totalReceived - totalContributed) / totalContributed) * 100 : 0;

      // Mocked monthly growth for brevity
      const monthlyGrowth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const currentMonthGrowth = 0;

      // Mocked live activities
      const liveActivities: any[] = [];

      res.json({
        success: true,
        data: {
          total_contributed: totalContributed,
          active_tontines: activeTontines,
          reliability_score: 100, // mock
          recent_notifications: recentNotifications,
          yield: Number(yieldPercent.toFixed(1)),
          monthly_growth: monthlyGrowth,
          current_month_growth: currentMonthGrowth,
          live_activities: liveActivities,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async fortuneCalendar(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          total_expected: 0,
          total_inflow: 0,
          total_outflow: 0,
          growth_percentage: 0,
          days: {},
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
