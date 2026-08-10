import { Bell, Cake, Inbox } from 'lucide-react'
import { formatNotificationTime } from '../../utils'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function StaffNotificationsTab({
  staffNotifications,
  visibleBirthdays,
  reminderNotifications,
  totalNotifCount,
  userEmail,
  navigateTo,
  setDismissedBirthdays
}) {
  const queryClient = useQueryClient()

  const handleDismissLeadNotif = async (notifId, ids) => {
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return oldData
      return { ...oldData, staffNotifications: oldData.staffNotifications.filter(n => n.id !== notifId) }
    })
    await supabase.from('leads').update({ staff_reviewed: true }).in('id', ids)
  }

  const handleDismissBirthday = (customerId) => {
    setDismissedBirthdays(prev => new Set([...prev, customerId]))
  }

  const handleDismissReminder = async (reminderId) => {
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return oldData
      return { ...oldData, reminderNotifications: (oldData.reminderNotifications ?? []).filter(r => r.id !== reminderId) }
    })
    await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', reminderId)
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div style={{background: '#1e1b4b'}} className="rounded p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 50%, #818cf8 0%, transparent 60%)'}}></div>
        <div className="relative z-10 flex items-center gap-3.5">
          <span className="bg-white/15 rounded p-2.5 flex-shrink-0"><Bell className="w-6 h-6 text-white" /></span>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Notifications</h2>
            <p className="text-indigo-200 text-xs sm:text-sm font-medium">{totalNotifCount > 0 ? `${totalNotifCount} unread` : 'All clear — no new notifications'}</p>
          </div>
        </div>
      </div>

      {totalNotifCount === 0 && (
        <div className="bg-white rounded shadow-sm border border-gray-100 p-12 text-center">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">No notifications right now.</p>
          <p className="text-gray-400 text-sm mt-1">You'll be notified when leads are assigned, a customer has a birthday, or a reminder is due.</p>
        </div>
      )}

      <div className="space-y-3">
        {/* New lead drops */}
        {staffNotifications.map(notif => (
          <div key={notif.id} className="border border-indigo-200 rounded p-5 bg-indigo-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissLeadNotif(notif.id, notif.ids)}
              className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-indigo-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Inbox className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                  <h3 className="font-black text-indigo-900 text-sm">New Leads Assigned</h3>
                  {notif.createdAt && (
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100/70 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
                      {formatNotificationTime(notif.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-indigo-800 mt-0.5">{notif.message}</p>
                <button onClick={() => navigateTo('leads')} className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition">View Leads →</button>
              </div>
            </div>
          </div>
        ))}

        {/* Birthday notifications */}
        {visibleBirthdays.map(customer => (
          <div key={customer.id} className="border border-rose-200 rounded p-5 bg-rose-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissBirthday(customer.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-rose-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-rose-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Cake className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                  <h3 className="font-black text-rose-900 text-sm flex items-center gap-1.5"><Cake className="w-4 h-4 text-rose-500" /> Birthday Today!</h3>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-100/70 border border-rose-200/60 px-2.5 py-0.5 rounded-full">
                    Today
                  </span>
                </div>
                <p className="text-sm text-rose-800 mt-0.5">
                  <strong>{customer.fullName}</strong>'s birthday is today — great time to follow up!
                </p>
                <button onClick={() => navigateTo('pipeline')} className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 underline underline-offset-2 transition">Go to Pipeline →</button>
              </div>
            </div>
          </div>
        ))}

        {/* Follow-up reminder notifications */}
        {reminderNotifications.map(reminder => (
          <div key={reminder.id} className="border border-violet-200 rounded p-5 bg-violet-50/50 relative group shadow-sm">
            <button
              onClick={() => handleDismissReminder(reminder.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-violet-600 font-bold text-xs p-1 rounded-md bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-violet-100"
            >✕ Dismiss</button>
            <div className="flex items-start gap-3 pr-20">
              <Bell className="w-6 h-6 text-violet-500 flex-shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                  <h3 className="font-black text-violet-900 text-sm flex items-center gap-1.5"><Bell className="w-4 h-4 text-violet-500" /> Follow-Up Reminder</h3>
                  {reminder.createdAt && (
                    <span className="text-[11px] font-bold text-violet-600 bg-violet-100/70 border border-violet-200/60 px-2.5 py-0.5 rounded-full">
                      {formatNotificationTime(reminder.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-violet-800 mt-0.5">
                  <strong>{reminder.customerName}</strong> — {reminder.note}
                </p>
                <button onClick={() => navigateTo('pipeline')} className="mt-2 text-xs font-bold text-violet-600 hover:text-violet-800 underline underline-offset-2 transition">Go to Pipeline →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
