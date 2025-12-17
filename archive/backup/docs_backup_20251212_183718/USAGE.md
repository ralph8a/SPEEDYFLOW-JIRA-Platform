# SLA Implementation - User Guide
**Date**: 2025-11-20  
**Status**: Ready to Use
## What's New
SalesJIRA now displays real-time SLA countdown timers on every ticket card with intelligent color coding to help you prioritize work.
## Visual Guide - SLA Status Colors
### 🟢 HEALTHY (Green) - Plenty of Time
```
Remaining: > 16 hours
Icon: ✅
Color: Green
Example: "47 h 7 m" or "90 h 26 m"
Meaning: "Take your time, we're good"
```
### 🟡 ON-TRACK (Yellow) - Good Progress  
```
Remaining: 4-16 hours
Icon: 🟡
Color: Yellow/Gold
Example: "7 h 45 m" or "12 h 30 m"
Meaning: "Keep working, stay on pace"
```
### 🟠 WARNING (Orange) - Time Getting Tight
```
Remaining: 1-4 hours
Icon: 🟠
Color: Orange
Example: "2 h 15 m" or "3 h 45 m"
Meaning: "Speed up, time is short"
```
### 🔴 CRITICAL (Red) - Urgent
```
Remaining: < 1 hour
Icon: 🔴
Color: Red
Example: "45 m" or "30 m"
Meaning: "IMMEDIATE ACTION REQUIRED"
```
### 🔴 BREACHED (Dark Red) - Overdue
```
Remaining: Negative (past due)
Icon: ⛔
Color: Dark Red
Animation: Pulsing effect
Example: "Breached"
Meaning: "URGENT - Contact supervisor"
```
### 🔵 PAUSED (Blue) - Temporarily Stopped
```
Status: SLA timer paused
Icon: ⏸️
Color: Blue
Meaning: "Resume when ready"
```
### 🔵 COMPLETED (Blue) - Finished
```
Status: SLA period completed
Icon: ✅
Color: Blue
Meaning: "SLA fulfilled"
```
## How to Read the Display
### Example Ticket Card
```
┌─────────────────────────────────────────┐
│ AP-564                                  │
│ Fix critical payment gateway error      │
├─────────────────────────────────────────┤
│ 🔘 In Progress   🔴 HIGH               │
│ 👤 John Smith                           │
├─────────────────────────────────────────┤
│ 🟡 47 h 7 m                            │  ← SLA Status Badge
├─────────────────────────────────────────┤
│ 📅 Created: 02/nov    🔄 Updated: 20   │
└─────────────────────────────────────────┘
```
### Reading the Badge
The SLA badge shows:
- **Icon**: Visual indicator of SLA status
- **Time**: Remaining time (h = hours, m = minutes)
- **Color**: Background color indicates urgency level
## Color Quick Reference
| Color | Icon | Meaning | Urgency | Action |
|-------|------|---------|---------|--------|
| 🟢 Green | ✅ | Healthy | Low | Normal work |
| 🟡 Yellow | 🟡 | On-Track | Medium | Monitor progress |
| 🟠 Orange | 🟠 | Warning | High | Escalate if needed |
| 🔴 Red | 🔴 | Critical | Very High | Immediate action |
| ⛔ Dark Red | ⛔ | Breached | Critical | Contact supervisor |
| 🔵 Blue | ⏸️ | Paused | - | Resume when ready |
| ⏳ Gray | ⏳ | Loading | - | Wait for data |
## Real-World Examples
### Example 1: Plenty of Time (Green)
```
Ticket: AP-555
SLA Badge: ✅ 90 h 26 m
Status: HEALTHY
→ You have almost 4 days to resolve this
→ Work at normal pace
→ No urgency needed
```
### Example 2: Good Progress (Yellow)
```
Ticket: AP-564
SLA Badge: 🟡 47 h 7 m
Status: ON-TRACK
→ You have about 2 days remaining
→ Keep working steadily
→ No action needed yet
```
### Example 3: Time Running Short (Orange)
```
Ticket: AP-519
SLA Badge: 🟠 7 h 45 m
Status: WARNING
→ Only ~8 hours left
→ Prioritize this ticket
→ Consider escalating if blocked
```
### Example 4: Urgent (Red)
```
Ticket: ABC-123
SLA Badge: 🔴 45 m
Status: CRITICAL
→ Less than 1 hour left
→ DROP EVERYTHING
→ Escalate to team lead IMMEDIATELY
```
### Example 5: Past Due (Dark Red)
```
Ticket: XYZ-789
SLA Badge: ⛔ 2h overdue
Status: BREACHED
→ SLA was missed by 2 hours
→ CONTACT SUPERVISOR IMMEDIATELY
→ Document why SLA was breached
```
## Kanban Board View
When you select a Service Desk and Queue, you'll see all tickets organized by status with SLA timers:
```
┌────────────────────┬────────────────────┬────────────────────┐
│    TO DO (5)       │  IN PROGRESS (8)   │   DONE (3)         │
├────────────────────┼────────────────────┼────────────────────┤
│ ┌────────────────┐ │ ┌────────────────┐ │ ┌────────────────┐ │
│ │ AP-564         │ │ │ AP-555         │ │ │ AP-512         │ │
│ │ Fix payment    │ │ │ Database slow  │ │ │ Add feature    │ │
│ │ 🟡 47h 7m      │ │ │ ✅ 90h 26m     │ │ │ ✅ Completed   │ │
│ └────────────────┘ │ └────────────────┘ │ └────────────────┘ │
│                    │                    │                    │
│ ┌────────────────┐ │ ┌────────────────┐ │                    │
│ │ AP-519         │ │ │ AP-518         │ │                    │
│ │ Login issue    │ │ │ Email bouncing │ │                    │
│ │ 🟠 7h 45m      │ │ │ 🟡 12h 30m     │ │                    │
│ └────────────────┘ │ └────────────────┘ │                    │
│                    │                    │                    │
│ ...more tickets    │ ...more tickets    │ ...more            │
└────────────────────┴────────────────────┴────────────────────┘
```
At a glance, you can see:
- 🔴 Red badges need immediate attention
- 🟠 Orange badges need priority
- 🟡 Yellow badges are progressing normally
- ✅ Green badges are in good shape
## Tips & Tricks
### 1. Prioritize by Color
- Focus on RED tickets first (< 1 hour)
- Then ORANGE tickets (1-4 hours)
- Then YELLOW tickets (4-16 hours)
- GREEN tickets can wait
### 2. Plan Your Day
```
Morning:
  - Look for 🔴 RED tickets → handle first
  - Look for 🟠 ORANGE tickets → handle second
Afternoon:
  - Review 🟡 YELLOW tickets → plan ahead
  - Complete remaining 🟢 GREEN tickets
```
### 3. Set Personal Alerts
- When you see 🟠 ORANGE → bump up to your to-do priority
- When you see 🔴 RED → alert your team immediately
- When you see ⛔ DARK RED → contact supervisor
### 4. Use Remaining Time
- Don't wait for badge to turn red
- If you see 🟡 YELLOW (4-16 hours), check if you can start
- If you see 🟠 ORANGE (1-4 hours), you should be working on it
- If you see 🔴 RED (< 1 hour), you should be actively solving it
## FAQ
### Q: Why does my ticket show "⏳ Loading..."?
**A**: The system is fetching SLA data from JIRA. This should appear within 1-2 seconds. If it stays longer, check your internet connection.
### Q: Why is my ticket color different than I expected?
**A**: The color is based on actual remaining SLA time from JIRA. Make sure the ticket's SLA is properly configured in JIRA Service Desk.
### Q: What if the SLA badge doesn't show?
**A**: This means the ticket doesn't have an active SLA configured. Contact your administrator to ensure the ticket's service desk has SLA policies.
### Q: Can I manually update the SLA time?
**A**: No, SLA times are automatically managed by JIRA Service Desk. Changes must be made in JIRA or by your administrator.
### Q: How often does the SLA time update?
**A**: The display updates when you load a new queue or page. The times are always fresh from JIRA Service Desk.
### Q: What's the difference between "Paused" and "Pending"?
**A**: 
- **Paused** = SLA was active but is now temporarily stopped (you requested a pause)
- **Pending** = SLA hasn't started yet (ticket not yet assigned/in wrong status)
### Q: What if I see the loading spinner for too long?
**A**: Try these steps:
1. Refresh the page (F5)
2. Clear browser cache (Ctrl+Shift+R)
3. Check your internet connection
4. Contact IT if problem persists
## Support & Feedback
### Found a Bug?
1. Note the ticket key (e.g., AP-564)
2. Screenshot the SLA badge
3. Note what you expected vs. what you saw
4. Report to IT team with this info
### Have a Suggestion?
- Would you like countdown to show seconds when < 1 hour?
- Want audio alerts for 🔴 RED tickets?
- Need email notifications?
- Contact your product team!
### Need Help?
- Email: it-support@company.com
- Slack: #salesjira-help
- Phone: (555) 123-4567
## Quick Start (New to SalesJIRA)
1. **Open SalesJIRA**
   - Login to your account
   - Go to SalesJIRA dashboard
2. **Select Queue**
   - Pick a Service Desk
   - Pick a Queue
   - Kanban board appears
3. **Look at SLA Badges**
   - Each ticket card shows SLA time
   - Color indicates urgency
   - 🟢 = Good, 🔴 = Urgent
4. **Prioritize**
   - Focus on RED and ORANGE tickets first
   - Use color as quick guide
   - No special action needed!
## Summary
The new SLA display:
- ✅ Shows remaining time automatically
- ✅ Uses color coding for quick priority scanning
- ✅ Updates in real-time as clocks tick
- ✅ Helps you stay on top of SLAs
- ✅ Makes prioritization easier
**Start using it today to improve your SLA compliance!**
---
**Last Updated**: 2025-11-20  
**Version**: 1.0  
**Status**: Production Ready
