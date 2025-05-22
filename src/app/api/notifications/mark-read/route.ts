import { NextResponse } from 'next/server';
import { markNotificationAsRead, markAllNotificationsAsReadByUserId } from '@/app/api/lib/data-vietnamese';

// PUT /api/notifications/mark-read
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, userId, markAll } = body;

    // Case 1: Mark a single notification as read
    if (notificationId) {
      const id = parseInt(notificationId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid notification ID format' }, { status: 400 });
      }

      const updatedNotification = await markNotificationAsRead(id);
      if (!updatedNotification) {
        return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
      }

      const notificationForApi = {
        ...updatedNotification,
        timestamp: updatedNotification.timestamp.toISOString(),
      };

      return NextResponse.json(notificationForApi, { status: 200 });
    }

    // Case 2: Mark all notifications for a user as read
    if (userId && markAll) {
      const updatedNotifications = await markAllNotificationsAsReadByUserId(userId);

      const notificationsForApi = updatedNotifications.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
      }));

      return NextResponse.json(notificationsForApi, { status: 200 });
    }

    return NextResponse.json({
      message: 'Invalid request. Provide either notificationId or both userId and markAll=true'
    }, { status: 400 });
  } catch (error) {
    console.error('Error in PUT /api/notifications/mark-read:', error);
    return NextResponse.json({ message: 'Failed to mark notification(s) as read' }, { status: 500 });
  }
}
