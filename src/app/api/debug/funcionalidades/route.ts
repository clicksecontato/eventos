import { NextRequest, NextResponse } from 'next/server';
import { FuncionalidadeRepository } from '@/lib/repositories/funcionalidade-repository';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const repo = new FuncionalidadeRepository();
    
    // Testar busca direta no Firestore
    const collectionRef = collection(db, 'funcionalidades');
    const snapshot = await getDocs(collectionRef);
    
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Testar repositório
    let repoFuncs: any[] = [];
    try {
      repoFuncs = await repo.findAll();
    } catch (error: any) {
      console.error('Erro no repositório:', error);
    }

    return NextResponse.json({
      firestore_direct: {
        count: docs.length,
        docs: docs
      },
      repository: {
        count: repoFuncs.length,
        funcionalidades: repoFuncs
      },
      collection_exists: snapshot.size > 0
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

