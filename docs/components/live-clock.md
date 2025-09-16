# LiveClock Component Documentation

## Overview
The `LiveClock` component provides a real-time clock display with date, time, and timezone information, fully integrated with the Omnia Holiday Tracker's multi-language system.

## Features
- **Real-time Updates**: Updates every second to show current time
- **Multi-language Support**: Proper locale formatting for Italian, English, and Spanish
- **Responsive Design**: Compact mode for smaller screens
- **Timezone Display**: Shows current timezone information
- **European Time Format**: Uses 24-hour format for professional appearance
- **Design System Integration**: Follows project Tailwind CSS styling

## Props

```typescript
interface LiveClockProps {
  className?: string      // Additional CSS classes
  showSeconds?: boolean   // Whether to display seconds (default: true)
  showTimezone?: boolean  // Whether to show timezone info (default: true)
  compact?: boolean       // Use compact layout (default: false)
}
```

## Usage Examples

### Basic Usage
```tsx
import { LiveClock } from "@/components/ui/live-clock"

// Full clock with all features
<LiveClock />

// Compact version for headers
<LiveClock compact showSeconds={false} />

// Minimal version
<LiveClock showTimezone={false} />
```

### Integration in Headers
The clock is automatically integrated into the `CustomizableHeader` component:

```tsx
// In CustomizableHeader component
<div className="hidden lg:flex">
  <LiveClock compact showSeconds={false} />
</div>
```

## Localization
The component automatically adapts to the current locale:

- **Italian (it)**: Uses `it-IT` locale formatting
- **English (en)**: Uses `en-GB` locale formatting
- **Spanish (es)**: Uses `es-ES` locale formatting

### Translation Keys
Clock-related translations are stored in `lib/i18n/translations/common/`:

```typescript
clock: {
  currentTime: 'Ora attuale',    // IT
  timezone: 'Fuso orario',       // IT
}
```

## Styling
The component uses Tailwind CSS classes and follows the project's design system:

- **Colors**: Uses `text-omnia` for primary time display
- **Typography**: Monospace font for time, regular font for date
- **Icons**: Clock icon from Lucide React
- **Layout**: Flexbox with proper spacing

## Responsive Behavior
- **Desktop (lg+)**: Full display with all information
- **Mobile/Tablet**: Hidden on smaller screens to save space
- **Compact Mode**: Reduced size and simplified layout

## Technical Implementation
- **Update Frequency**: 1000ms interval using `setInterval`
- **Memory Management**: Proper cleanup with `clearInterval` on unmount
- **Performance**: Minimal re-renders, only updates when time changes
- **Accessibility**: Proper semantic structure and readable text

## Integration Points
The LiveClock is integrated in:
1. **CustomizableHeader**: Main header component for dashboards
2. **DashboardHeader**: Alternative header (already prepared)
3. **Both Employee and Admin dashboards**: Automatically available

## Future Enhancements
The component structure supports future features:
- User-specific timezone preferences
- Different time formats (12/24 hour)
- Custom date formats
- Clock themes and styles
- Animation effects