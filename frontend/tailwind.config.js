/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			neutral: {
  				'50': 'oklch(0.985 0 0)',
  				'100': 'oklch(0.97 0 0)',
  				'200': 'oklch(0.922 0 0)',
  				'300': 'oklch(0.87 0 0)',
  				'400': 'oklch(0.708 0 0)',
  				'500': 'oklch(0.556 0 0)',
  				'600': 'oklch(0.439 0 0)',
  				'700': 'oklch(0.371 0 0)',
  				'800': 'oklch(0.269 0 0)',
  				'900': 'oklch(0.205 0 0)',
  				'950': 'oklch(0.145 0 0)'
  			},
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Geist Sans',
  				'Inter',
  				'var(--font-sans)',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			mono: [
  				'Geist Mono',
  				'var(--font-mono)',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		fontSize: {
  			xs: [
  				'0.75rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			sm: [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			base: [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			lg: [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			xl: [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '2.5rem'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1'
  				}
  			],
  			'6xl': [
  				'3.75rem',
  				{
  					lineHeight: '1'
  				}
  			],
  			'7xl': [
  				'4.5rem',
  				{
  					lineHeight: '1'
  				}
  			],
  			'8xl': [
  				'6rem',
  				{
  					lineHeight: '1'
  				}
  			],
  			'9xl': [
  				'8rem',
  				{
  					lineHeight: '1'
  				}
  			]
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700',
  			extrabold: '800',
  			black: '900'
  		},
  		lineHeight: {
  			none: '1',
  			tight: '1.25',
  			snug: '1.375',
  			normal: '1.5',
  			relaxed: '1.625',
  			loose: '2'
  		},
  		spacing: {
  			'0': '0rem',
  			'1': '0.25rem',
  			'2': '0.5rem',
  			'3': '0.75rem',
  			'4': '1rem',
  			'5': '1.25rem',
  			'6': '1.5rem',
  			'7': '1.75rem',
  			'8': '2rem',
  			'9': '2.25rem',
  			'10': '2.5rem',
  			'11': '2.75rem',
  			'12': '3rem',
  			'14': '3.5rem',
  			'16': '4rem',
  			'20': '5rem',
  			'24': '6rem',
  			'28': '7rem',
  			'32': '8rem',
  			'36': '9rem',
  			'40': '10rem',
  			'44': '11rem',
  			'48': '12rem',
  			'52': '13rem',
  			'56': '14rem',
  			'60': '15rem',
  			'64': '16rem',
  			'72': '18rem',
  			'80': '20rem',
  			'96': '24rem',
  			px: '0.0625rem',
  			'0.5': '0.125rem',
  			'1.5': '0.375rem',
  			'2.5': '0.625rem',
  			'3.5': '0.875rem'
  		},
  		borderRadius: {
  			none: '0px',
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 4px)',
  			full: '9999px'
  		},
  		boxShadow: {
  			sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  			DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  			md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  			lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  			xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  			'2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  			inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  			none: '0 0 #0000'
  		},
  		transitionDuration: {
  			ultrafast: '50ms',
  			fast: '100ms',
  			DEFAULT: '200ms',
  			slow: '300ms',
  			ultraslow: '500ms'
  		},
  		transitionTimingFunction: {
  			linear: 'linear',
  			ease: 'ease',
  			'ease-in': 'ease-in',
  			'ease-out': 'ease-out',
  			'ease-in-out': 'ease-in-out',
  			DEFAULT: 'cubic-bezier(0.4, 0, 0.6, 1)',
  			ping: 'cubic-bezier(0, 0, 0.2, 1)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			spin: {
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			},
  			ping: {
  				'75%, 100%': {
  					transform: 'scale(2)',
  					opacity: '0'
  				}
  			},
  			pulse: {
  				'50%': {
  					opacity: '0.5'
  				}
  			},
  			bounce: {
  				'0%, 100%': {
  					transform: 'translateY(-25%)',
  					animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
  				},
  				'50%': {
  					transform: 'none',
  					animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			spin: 'spin 1s linear infinite',
  			ping: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
  			pulse: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
  			bounce: 'bounce 1s infinite'
  		},
  		screens: {
  			sm: '640px',
  			md: '768px',
  			lg: '1024px',
  			xl: '1280px',
  			'2xl': '1536px'
  		},
  		container: {
  			center: true,
  			padding: {
  				DEFAULT: '1rem',
  				lg: '1.5rem'
  			},
  			screens: {
  				sm: '640px',
  				md: '768px',
  				lg: '1024px',
  				xl: '1280px',
  				'2xl': '1536px'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
