import './globals.css';
import { Providers } from '@/components/providers';
export const metadata={title:'FrostTrack | Smart Refrigerator Monitoring',description:'Arduino Mega IoT inventory and temperature dashboard with manager reordering.'};
export default function RootLayout({children}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
