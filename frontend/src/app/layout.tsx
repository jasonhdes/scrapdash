import type { Metadata } from 'next';
import { Ubuntu } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const ubuntu = Ubuntu({
  variable: '--font-ubuntu',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Scrap Dash',
  description: 'Gestão de vendas no Mercado Livre',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={ubuntu.variable}>
      <head>
        <script
          // Aplica o tema antes do React hidratar, pra não piscar claro->escuro.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("scrapdash_theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
