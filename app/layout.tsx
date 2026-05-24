import './globals.css'

export const metadata = {
    title: 'Wordle Tiếng Việt - Vietnamese Wordle | @minhqnd',
    description: 'Đoán từ trong tiếng Việt với Wordle. Chơi ngay để thử thách khả năng từ vựng của bạn!',
    keywords: ['Wordle', 'Vietnamese', 'game', 'vietnamese wordle', 'wordle vietnamese', 'vietnamese wordle game', 'wordle tiếng việt', 'trò chơi đoán từ tiếng việt', 'trò chơi đoán từ', 'trò chơi đoán từ tiếng việt online', 'trò chơi đoán từ tiếng việt miễn phí', 'đoán từ', 'đoán từ tiếng việt'],
    metadataBase: new URL('https://minhqnd.com'),
    alternates: {
        canonical: '/wordle',
    },
    openGraph: {
        title: 'Wordle Tiếng Việt - Vietnamese Wordle | @minhqnd',
        description: 'Đoán từ trong tiếng Việt với Wordle. Chơi ngay để thử thách khả năng từ vựng của bạn!',
        locale: 'vi_VN',
        url: 'https://minhqnd.com/wordle',
        siteUrl: 'https://minhqnd.com/wordle',
        siteName: 'Wordle Tiếng Việt - Vietnamese Wordle | @minhqnd',
        type: 'website',
        images: [
            {
                url: '/img/wordle_vi_1200x630.png',
                width: 1200,
                height: 630,
                alt: 'Wordle Tiếng Việt - Vietnamese Wordle',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Wordle Tiếng Việt - Vietnamese Wordle | @minhqnd',
        description: 'Đoán từ trong tiếng Việt với Wordle. Chơi ngay để thử thách khả năng từ vựng của bạn!',
        site: '@minhqnd',
        creator: '@minhqnd',
        images: ['/img/wordle_vi_1200x630.png'],
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.ico',
        apple: '/apple-touch-icon.png',
    },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={``}>
        {children}
      </body>
    </html>
  )
}
