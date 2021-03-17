import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface TransactionCreate {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category: categoryTitle,
  }: TransactionCreate): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    // Validate Type
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('Invalid transaction type');
    }
    // Validate Value
    if (value <= 0) {
      throw new AppError('Invalid transaction value');
    }
    // Validate current Balance
    if (type === 'outcome') {
      const { total } = await transactionRepository.getBalance();
      if (total < value) {
        throw new AppError('Insufficient Balance');
      }
    }

    // Finding or Creating categories
    const categoryRepository = getRepository(Category);
    let transactionCategory = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });
    if (!transactionCategory) {
      transactionCategory = categoryRepository.create({ title: categoryTitle });
      await categoryRepository.save(transactionCategory);
    }

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category: transactionCategory,
    });

    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
