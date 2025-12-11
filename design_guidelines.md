# MERF AI Hub - Design Guidelines

## Design Approach

**Selected Approach**: Cinematic Analytics  
**Primary Inspiration**: Film noir aesthetics + Modern data dashboards  
**Mood**: Atmospheric, moody, mysterious with deep blues and cyan accents  
**Rationale**: Creates an immersive, premium feel for emotional AI analytics while maintaining data clarity

## Core Design Principles

1. **Atmospheric Depth**: Deep, layered backgrounds with subtle gradients
2. **Cinematic Lighting**: Strategic use of glows and highlights against dark surfaces
3. **Data Clarity**: Bright cyan/teal accents make data pop against dark backgrounds
4. **Mysterious Elegance**: Professional yet intriguing visual language

## Color System

### Primary Palette
- **Background Deep**: `hsl(227, 31%, 20%)` - Deep navy blue (#2D3654)
- **Background Surface**: `hsl(227, 28%, 25%)` - Slightly elevated navy (#3D4766)
- **Background Card**: `hsl(227, 25%, 30%)` - Card surfaces (#4B5A82)
- **Background Muted**: `hsl(227, 22%, 35%)` - Muted elements

### Accent Colors
- **Primary Cyan**: `hsl(185, 80%, 50%)` - Main accent (#19B5B5)
- **Primary Light**: `hsl(185, 75%, 60%)` - Lighter cyan
- **Secondary Teal**: `hsl(175, 70%, 45%)` - Secondary accent
- **Highlight Glow**: `hsl(185, 100%, 70%)` - Glow effects

### Semantic Colors
- **Success**: `hsl(160, 60%, 45%)` - Teal green
- **Warning**: `hsl(38, 90%, 55%)` - Warm amber
- **Destructive**: `hsl(0, 70%, 55%)` - Muted red
- **Info**: `hsl(210, 80%, 60%)` - Bright blue

### Text Colors
- **Foreground**: `hsl(210, 40%, 95%)` - Near white
- **Foreground Muted**: `hsl(215, 20%, 65%)` - Subdued text
- **Foreground Subtle**: `hsl(220, 15%, 50%)` - Very subtle text

## Typography System

**Font Stack**: Inter (primary) via Google Fonts CDN
- Display/Hero: font-bold text-3xl (30px) for page titles
- Section Headers: font-semibold text-xl (20px) for sections
- Card Titles: font-medium text-lg (18px) for cards
- Body: font-normal text-base (16px) for descriptions
- Metrics: font-bold text-2xl (24px) for numbers
- Small Text: font-medium text-sm (14px) for badges
- Micro: font-normal text-xs (12px) for timestamps

## Layout System

**Spacing Primitives**: Use Tailwind units 2, 4, 6, 8
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Margin between sections: mb-6, mb-8

**Grid Layouts**:
- Metrics Grid: grid-cols-2 md:grid-cols-4 gap-4
- Dashboard Sections: grid-cols-1 lg:grid-cols-2 gap-6
- Content Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

## Component Styling

### Cards
- Background: bg-card with slight transparency
- Border: Subtle border with low opacity
- Border Radius: rounded-xl for softer, modern feel
- Shadow: Subtle glow effect on hover

### Buttons
- Primary: Cyan background with dark text
- Secondary: Transparent with cyan border
- Ghost: Transparent with subtle hover glow

### Charts & Data Visualization
- Use cyan/teal gradient for primary data series
- Use complementary blues for secondary series
- Grid lines: Very subtle, low opacity
- Labels: Muted foreground color

### Badges & Tags
- Background: Semi-transparent with accent color
- Text: Accent color or white
- Border Radius: rounded-full for pills

## Interaction Patterns

**Hover States**: 
- Subtle glow effect
- Slight brightness increase
- No scale transforms

**Focus States**: 
- Cyan ring outline
- High visibility for accessibility

**Transitions**: 
- duration-200 for most interactions
- Smooth opacity and color changes

## Dark Mode Focus

This design is inherently dark-first:
- All surfaces use deep navy/blue tones
- Light mode can invert with warm grays
- Accent colors remain consistent across modes

## Visual Effects

**Atmospheric Elements**:
- Subtle gradients on large surfaces
- Soft shadows for depth
- Optional: Subtle noise texture overlay

**Data Highlights**:
- Glowing accent colors for important metrics
- Contrast between dark surfaces and bright data

---

**Final Note**: This design creates an immersive, premium analytics experience. The dark, cinematic aesthetic should feel sophisticated while keeping data highly readable.
