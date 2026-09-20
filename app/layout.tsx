import type {ReactNode} from 'react';
export const metadata = {
  title: 'YouCan Code Manager',
  description: 'Remotely manage your YouCan store custom code, IP protection, and customer restrictions.',
};
export default function Root({children}:{children:ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{margin:0,background:'#f0f2f5',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',color:'#1a1f2e'}}>
        {children}
      </body>
    </html>
  );
}
