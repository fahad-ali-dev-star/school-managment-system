import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=============================================');
console.log('       GENERATED VAPID KEYS FOR PWA PUSH     ');
console.log('=============================================\n');
console.log('Add these to your .env.local and Vercel Environment Variables:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@beaconlight.edu.pk\n`);
console.log('=============================================\n');
