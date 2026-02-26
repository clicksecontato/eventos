import { SubcollectionRepository } from './subcollection-repository';
import { Evento } from '@/types';
import { where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { COLLECTIONS } from '../firestore/collections';

export class EventoRepository extends SubcollectionRepository<Evento> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.EVENTOS);
  }

  // Métodos específicos para eventos (agora sem userId pois é parte do path)
  async findByClienteId(clienteId: string, userId: string): Promise<Evento[]> {
    return this.findWhere('clienteId', '==', clienteId, userId);
  }

  async findByStatus(status: string, userId: string): Promise<Evento[]> {
    return this.findWhere('status', '==', status, userId);
  }

  async findByTipoEvento(tipoEvento: string, userId: string): Promise<Evento[]> {
    return this.findWhere('tipoEvento', '==', tipoEvento, userId);
  }

  async findByDataEvento(dataInicio: Date, dataFim: Date, userId: string): Promise<Evento[]> {
    return this.query([
      where('dataEvento', '>=', dataInicio),
      where('dataEvento', '<=', dataFim),
      orderBy('dataEvento', 'asc')
    ], userId);
  }

  async getEventosHoje(userId: string): Promise<Evento[]> {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    hoje.setHours(0, 0, 0, 0);
    const fimDoDia = new Date();
    fimDoDia.setHours(23, 59, 59, 999);
    
    // Ajustar para o fuso horário local
    const hojeLocal = new Date(hoje.getTime() - offset * 60000);
    const fimDoDiaLocal = new Date(fimDoDia.getTime() - offset * 60000);
    
    return this.findByDataEvento(hojeLocal, fimDoDiaLocal, userId);
  }

  async getProximosEventos(userId: string, limit: number = 10): Promise<Evento[]> {
    const hoje = new Date();
    const eventos = await this.query([
      where('dataEvento', '>=', hoje),
      orderBy('dataEvento', 'asc'),
      firestoreLimit(limit * 2) // Buscar mais para compensar filtro
    ], userId);
    // Filtrar apenas eventos não arquivados
    return eventos.filter(e => !e.arquivado).slice(0, limit);
  }

  async getEventosPorMes(mes: number, ano: number, userId: string): Promise<Evento[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    return this.findByDataEvento(inicioMes, fimMes, userId);
  }

  async searchByLocal(local: string, userId: string): Promise<Evento[]> {
    // Busca simples por local - em produção seria melhor usar Algolia
    const allEventos = await this.findAll(userId);
    return allEventos.filter(evento => 
      evento.local.toLowerCase().includes(local.toLowerCase()) ||
      evento.endereco.toLowerCase().includes(local.toLowerCase())
    );
  }

  async getEventosPorPeriodo(inicio: Date, fim: Date, userId: string): Promise<Evento[]> {
    return this.findByDataEvento(inicio, fim, userId);
  }

  // Métodos de conveniência que mantêm a interface original
  async createEvento(evento: Omit<Evento, 'id' | 'dataCadastro' | 'dataAtualizacao'>, userId: string): Promise<Evento> {
    const eventoWithMeta = {
      ...evento,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<Evento, 'id'>;
    
    return this.create(eventoWithMeta, userId);
  }

  async updateEvento(id: string, evento: Partial<Evento>, userId: string): Promise<Evento> {
    const eventoWithMeta = {
      ...evento,
      dataAtualizacao: new Date()
    };
    
    return this.update(id, eventoWithMeta, userId);
  }

  async deleteEvento(id: string, userId: string): Promise<void> {
    // Arquivamento ao invés de exclusão física
    await this.update(id, {
      arquivado: true,
      dataArquivamento: new Date()
    }, userId);
  }
  
  async desarquivarEvento(id: string, userId: string): Promise<void> {
    await this.update(id, {
      arquivado: false,
      dataArquivamento: undefined,
      motivoArquivamento: undefined
    }, userId);
  }
  
  async getArquivados(userId: string): Promise<Evento[]> {
    return this.findWhere('arquivado', '==', true, userId);
  }
  
  async getAtivos(userId: string): Promise<Evento[]> {
    // Buscar eventos não arquivados (arquivado !== true ou arquivado é undefined/null)
    const todos = await this.findAll(userId);
    return todos.filter(e => !e.arquivado);
  }

  async getEventoById(id: string, userId: string): Promise<Evento | null> {
    return this.findById(id, userId);
  }
}
