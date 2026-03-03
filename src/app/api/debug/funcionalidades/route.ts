import { NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export async function GET() {
  try {
    const repo = repositoryFactory.getFuncionalidadeRepository();
    
    // Testar busca direta no Firestore
    const collectionRef = collection(db, 'funcionalidades');
    const snapshot = await getDocs(collectionRef);
    
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Testar repositório
    let repoFuncs: unknown[] = [];
    try {
      repoFuncs = await repo.findAll();
    } catch (error: unknown) {
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
  } catch (error: unknown) {
    return NextResponse.json({
      error: getErrorMessage(error),
      stack: getErrorStack(error)
    }, { status: 500 });
  }
}

