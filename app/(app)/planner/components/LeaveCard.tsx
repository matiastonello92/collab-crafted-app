'use client'

import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, User } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface LeaveType {
  id: string
  key: string
  label: string
  color: string | null
}

interface LeaveProfile {
  id: string
  full_name: string | null
}

interface LeaveRequest {
  id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  status: string
  reason: string | null
  leave_types: LeaveType
  profiles: LeaveProfile
}

interface LeaveCardProps {
  leave: LeaveRequest
  showUserName?: boolean
}

// Convert hex to rgba for controlled opacity
function hexToRgba(hex: string | null | undefined, alpha: number = 1): string {
  if (!hex) return `rgba(200, 200, 200, ${alpha})`
  
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Determina se è mezza giornata o giornata intera
function getLeaveTimeDisplay(start: string, end: string): string {
  const startTime = format(new Date(start), 'HH:mm')
  const endTime = format(new Date(end), 'HH:mm')
  
  // Mezza giornata mattina: 00:00 - 12:00 circa
  if (startTime === '00:00' && (endTime === '12:00' || endTime === '13:00')) {
    return 'Mattina'
  }
  
  // Mezza giornata pomeriggio: 12:00/13:00 - 23:59
  if ((startTime === '12:00' || startTime === '13:00') && endTime === '23:59') {
    return 'Pomeriggio'
  }
  
  // Giornata intera
  return 'Giornata intera'
}

export function LeaveCard({ leave, showUserName = false }: LeaveCardProps) {
  const bgColor = hexToRgba(leave.leave_types.color, 0.15)
  const borderColor = hexToRgba(leave.leave_types.color, 0.6)
  const textColor = hexToRgba(leave.leave_types.color, 1)
  
  const timeDisplay = getLeaveTimeDisplay(leave.start_at, leave.end_at)
  
  return (
    <Card
      className="p-1.5 border-2 overflow-hidden cursor-default"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderStyle: 'dashed'
      }}
    >
      <div className="flex items-start gap-1.5">
        <Calendar 
          className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" 
          style={{ color: textColor }}
        />
        
        <div className="flex-1 min-w-0">
          <div 
            className="text-xs font-bold truncate leading-tight"
            style={{ color: textColor }}
          >
            {leave.leave_types.label}
          </div>
          
          {showUserName && leave.profiles.full_name && (
            <div className="flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" style={{ color: textColor }} />
              <span 
                className="text-xs truncate"
                style={{ color: textColor, opacity: 0.8 }}
              >
                {leave.profiles.full_name}
              </span>
            </div>
          )}
          
          <div 
            className="text-xs mt-0.5 truncate"
            style={{ color: textColor, opacity: 0.9 }}
          >
            {timeDisplay}
          </div>
        </div>
      </div>
      
      {leave.reason && (
        <div 
          className="text-xs mt-1 pt-1 border-t truncate"
          style={{ 
            color: textColor, 
            opacity: 0.7,
            borderColor: borderColor
          }}
        >
          {leave.reason}
        </div>
      )}
    </Card>
  )
}
