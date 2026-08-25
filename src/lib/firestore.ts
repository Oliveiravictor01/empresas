import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  AppData,
  Company,
  UserAccount,
} from '../types';

let firebaseApp: any = null;
let firestoreDb: any = null;
let isFirestoreDisabled = false;

export function getFirestoreDb() {
  if (isFirestoreDisabled) return null;
  if (firestoreDb) return firestoreDb;

  try {
    const config = {
      projectId: "absolute-summit-bxctm",
      appId: "1:75365969412:web:76312106a7d5a8fb368f51",
      apiKey: "AIzaSyBzlxNQxdg4H-XBaf0-DMMkIV1Us1oXJyY",
      authDomain: "absolute-summit-bxctm.firebaseapp.com",
      firestoreDatabaseId: "(default)",
      storageBucket: "absolute-summit-bxctm.firebasestorage.app",
      messagingSenderId: "75365969412",
    };

    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    try {
      firestoreDb = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
    } catch {
      firestoreDb = getFirestore(firebaseApp);
    }

    return firestoreDb;
  } catch (error) {
    isFirestoreDisabled = true;
    return null;
  }
}

/**
 * Verifica se já existe um Administrador Master configurado no banco de dados na nuvem (Firestore)
 */
export async function checkFirestoreMasterConfigured(): Promise<{
  configured: boolean;
  masterUser?: UserAccount | null;
}> {
  try {
    const db = getFirestoreDb();
    if (!db) return { configured: false, masterUser: null };

    // 1. Checar documento de configurações globais
    const configRef = doc(db, 'system_settings', 'master_config');
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data.master_configured) {
        // Buscar o usuário master correspondente
        if (data.master_user_id) {
          const userDoc = await getDoc(doc(db, 'users', data.master_user_id));
          if (userDoc.exists()) {
            return { configured: true, masterUser: userDoc.data() as UserAccount };
          }
        }
        return { configured: true, masterUser: null };
      }
    }

    // 2. Se não encontrar no master_config, verificar se há algum usuário MASTER na collection 'users'
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'MASTER'));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const firstMaster = querySnapshot.docs[0].data() as UserAccount;
      // Atualiza o master_config para sincronia futura
      await setDoc(configRef, {
        master_configured: true,
        master_user_id: firstMaster.id,
        master_email: firstMaster.email,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      return { configured: true, masterUser: firstMaster };
    }

    return { configured: false, masterUser: null };
  } catch (err) {
    console.warn('Aviso ao consultar Master no Firestore (modo offline/fallback):', err);
    return { configured: false, masterUser: null };
  }
}

/**
 * Registra o Administrador Master e cria as empresas iniciais no banco de dados na nuvem (Firestore)
 */
export async function initializeMasterInFirestore(
  masterUser: UserAccount,
  companies: Company[]
): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    if (!db) return false;

    const batch = writeBatch(db);

    // Salvar master_config
    const configRef = doc(db, 'system_settings', 'master_config');
    batch.set(configRef, {
      master_configured: true,
      master_user_id: masterUser.id,
      master_email: masterUser.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Salvar usuário master
    const userRef = doc(db, 'users', masterUser.id);
    batch.set(userRef, {
      ...masterUser,
      created_at: masterUser.created_at || new Date().toISOString(),
      status: 'active',
      role: 'MASTER',
      is_master: true,
    });

    // Salvar empresas
    for (const company of companies) {
      const compRef = doc(db, 'companies', company.id);
      batch.set(compRef, company);
    }

    // Log de auditoria
    const logRef = doc(db, 'activity_logs', `log-setup-${Date.now()}`);
    batch.set(logRef, {
      id: `log-setup-${Date.now()}`,
      user_id: masterUser.id,
      user_name: masterUser.name,
      user_email: masterUser.email,
      module: 'SISTEMA',
      action: 'CRIAR',
      description: 'Configuração Inicial do Administrador Master e inicialização do banco de dados na nuvem.',
      timestamp: new Date().toISOString(),
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.error('Erro ao registrar Master no Firestore:', err);
    return false;
  }
}

/**
 * Autentica um usuário contra a base do Firestore
 */
export async function authenticateWithFirestore(
  email: string,
  passwordAttempt: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      return { success: false, error: 'Banco de dados não disponível no momento.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: 'Usuário não encontrado. Verifique o e-mail digitado.' };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as UserAccount & { password?: string; password_hash?: string };

    if (userData.status !== 'active') {
      return { success: false, error: 'Esta conta de usuário está desativada no sistema.' };
    }

    // Validação de senha:
    const expectedPassword = userData.password || userData.password_hash;
    if (expectedPassword && expectedPassword !== passwordAttempt) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    return { success: true, user: userData as UserAccount };
  } catch (err: any) {
    console.error('Erro na autenticação Firestore:', err);
    return { success: false, error: err?.message || 'Falha ao autenticar no banco de dados.' };
  }
}

/**
 * Carrega todos os registros do Firestore para o App
 */
export async function loadAllDataFromFirestore(): Promise<Partial<AppData> | null> {
  try {
    const db = getFirestoreDb();
    if (!db) return null;

    const collections = [
      'companies',
      'sales',
      'expenses',
      'accounts_payable',
      'accounts_receivable',
      'products',
      'services',
      'inventory_movements',
      'customers',
      'suppliers',
      'tasks',
      'users',
      'activity_logs',
    ];

    const results: any = {};

    await Promise.all(
      collections.map(async (colName) => {
        try {
          const snap = await getDocs(collection(db, colName));
          results[colName] = snap.docs.map((d) => d.data());
        } catch (e) {
          console.warn(`Erro ao carregar coleção ${colName}:`, e);
          results[colName] = [];
        }
      })
    );

    return {
      companies: results.companies || [],
      sales: results.sales || [],
      expenses: results.expenses || [],
      accountsPayable: results.accounts_payable || [],
      accountsReceivable: results.accounts_receivable || [],
      products: results.products || [],
      services: results.services || [],
      inventoryMovements: results.inventory_movements || [],
      customers: results.customers || [],
      suppliers: results.suppliers || [],
      tasks: results.tasks || [],
      users: results.users || [],
      activityLogs: results.activity_logs || [],
      isDemoMode: false,
    };
  } catch (err) {
    console.error('Erro ao carregar dados do Firestore:', err);
    return null;
  }
}

/**
 * Sincroniza e salva um item individual no Firestore
 */
export async function syncDocToFirestore(
  collectionName: string,
  docId: string,
  data: any
): Promise<void> {
  try {
    const db = getFirestoreDb();
    if (!db || !docId) return;
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.warn(`Aviso ao sincronizar doc ${collectionName}/${docId}:`, e);
  }
}

/**
 * Deleta um documento individual do Firestore
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const db = getFirestoreDb();
    if (!db || !docId) return;
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn(`Aviso ao excluir doc ${collectionName}/${docId}:`, e);
  }
}

/**
 * Sincroniza toda a base de dados com o Firestore (Backup em Nuvem)
 */
export async function syncFullAppDataToFirestore(appData: AppData): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    if (!db) return false;

    const collectionsMapping: { key: keyof AppData; colName: string }[] = [
      { key: 'companies', colName: 'companies' },
      { key: 'sales', colName: 'sales' },
      { key: 'expenses', colName: 'expenses' },
      { key: 'accountsPayable', colName: 'accounts_payable' },
      { key: 'accountsReceivable', colName: 'accounts_receivable' },
      { key: 'products', colName: 'products' },
      { key: 'services', colName: 'services' },
      { key: 'inventoryMovements', colName: 'inventory_movements' },
      { key: 'customers', colName: 'customers' },
      { key: 'suppliers', colName: 'suppliers' },
      { key: 'tasks', colName: 'tasks' },
      { key: 'users', colName: 'users' },
      { key: 'activityLogs', colName: 'activity_logs' },
    ];

    for (const mapping of collectionsMapping) {
      const items = (appData[mapping.key] as any[]) || [];
      // Dividir em lotes de 200
      const chunkSize = 200;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (item && item.id) {
            const docRef = doc(db, mapping.colName, item.id);
            batch.set(docRef, item, { merge: true });
          }
        }
        await batch.commit();
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao sincronizar base completa com Firestore:', err);
    return false;
  }
}

/**
 * Limpa todos os dados no Firestore (para reset total do sistema)
 */
export async function clearFirestoreDatabase(): Promise<boolean> {
  try {
    const db = getFirestoreDb();
    if (!db) return false;

    const collections = [
      'companies',
      'sales',
      'expenses',
      'accounts_payable',
      'accounts_receivable',
      'products',
      'services',
      'inventory_movements',
      'customers',
      'suppliers',
      'tasks',
      'users',
      'activity_logs',
      'system_settings',
    ];

    for (const colName of collections) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao limpar Firestore:', err);
    return false;
  }
}
