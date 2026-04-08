// js/chat.js
import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function sendMessage(chatId, text) {
  if (!text.trim()) return false;
  
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ Not authenticated');
    return false;
  }
  
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      sender: user.uid,
      senderName: localStorage.getItem('whatsapp_username') || 'User',
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false
    });
    console.log('✓ Message sent');
    return true;
  } catch (error) {
    console.error('❌ Send error:', error);
    saveOffline(chatId, text);
    return false;
  }
}

export function subscribeToMessages(chatId, onMessages) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    onMessages(messages);
  }, (error) => {
    console.error('❌ Subscribe error:', error);
  });
}

function saveOffline(chatId, text) {
  const queue = JSON.parse(localStorage.getItem('smska_queue') || '[]');
  queue.push({ chatId, text, time: Date.now() });
  localStorage.setItem('smska_queue', JSON.stringify(queue));
  console.log('💾 Saved offline');
}

export async function flushQueue() {
  const queue = JSON.parse(localStorage.getItem('smska_queue') || '[]');
  if (queue.length === 0) return;
  
  console.log(`🔄 Sending ${queue.length} offline messages...`);
  
  for (let i = queue.length - 1; i >= 0; i--) {
    const { chatId, text } = queue[i];
    const success = await sendMessage(chatId, text);
    if (success) queue.splice(i, 1);
  }
  
  localStorage.setItem('smska_queue', JSON.stringify(queue));
}

window.addEventListener('online', flushQueue);
