import { NextResponse } from 'next/server';
import {
  addNotification as addNotificationToData,
  getNotificationsByUserId,
} from '@/app/api/lib/data-vietnamese';
import type { Notification as AppNotification } from '@/lib/types';

// GET /api/notifications?userId=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const userNotifications: AppNotification[] = await getNotificationsByUserId(userId);

    const notificationsForApi = userNotifications.map(n => {
      let timestampStr: string;

      if (n.timestamp instanceof Date && !isNaN(n.timestamp.getTime())) {
        timestampStr = n.timestamp.toISOString();
      } else if (typeof n.timestamp === 'string') {
        const parsedDate = new Date(n.timestamp);
        if (!isNaN(parsedDate.getTime())) {
          timestampStr = parsedDate.toISOString();
        } else {
          console.warn(`Notification ID ${n.id ?? 'unknown'} had an invalid string timestamp: ${n.timestamp}. Defaulting to now.`);
          timestampStr = new Date().toISOString();
        }
      } else {
        console.warn(`Notification ID ${n.id ?? 'unknown'} has an invalid or missing timestamp: ${n.timestamp}. Defaulting to now.`);
        timestampStr = new Date().toISOString();
      }

      return {
        ...n,
        timestamp: timestampStr,
      };
    });

    return NextResponse.json(notificationsForApi, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch notifications due to an internal server error.';
    return NextResponse.json(
      { message: 'Failed to fetch notifications', detail: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/notifications
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message, type } = body;

    if (!userId || !message || !type) {
      return NextResponse.json(
        { message: 'Missing required fields for notification (userId, message, type)' },
        { status: 400 }
      );
    }

    const validTypes: AppNotification['type'][] = ['overdue', 'new_borrow', 'general'];
    const finalType = validTypes.includes(type) ? type : 'general';

    if (type !== finalType) {
      console.warn(`Invalid notification type received: ${type}. Defaulting to 'general'.`);
    }

    const newNotification = await addNotificationToData({
      userId,
      message,
      type: finalType,
      isRead: false,
    });

    const notificationForApi = {
      ...newNotification,
      timestamp: newNotification.timestamp.toISOString(),
    };

    return NextResponse.json(notificationForApi, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to create notification due to an internal server error.';
    return NextResponse.json(
      { message: 'Failed to create notification', detail: errorMessage },
      { status: 500 }
    );
  }
}
