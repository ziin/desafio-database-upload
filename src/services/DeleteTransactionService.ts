import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionRepository.findOne({ where: { id } });
    if (!transaction) {
      throw new AppError('Transaction not found');
    }
    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
