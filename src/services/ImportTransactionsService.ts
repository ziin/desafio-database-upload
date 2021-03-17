import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const readStream = fs.createReadStream(filePath);

    const parser = csvParse({
      from_line: 2,
    });

    const parseCSV = readStream.pipe(parser);

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // wait until data is loaded
    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesRepository = getRepository(Category);
    const categoriesStored = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesToStore = categories
      .filter(
        category =>
          !categoriesStored.map(({ title }) => title).includes(category),
      )
      .filter((category, index, self) => self.indexOf(category) === index);

    const categoriesCreated = categoriesRepository.create(
      categoriesToStore.map(title => ({ title })),
    );

    await categoriesRepository.save(categoriesCreated);

    // combine the previous categories with new added categories
    const categoriesCombined = [...categoriesCreated, ...categoriesStored];

    // transactions
    const transactionRepository = getRepository(Transaction);
    const transactionsCreated = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: categoriesCombined.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    const transactionsStored = await transactionRepository.save(
      transactionsCreated,
    );

    await fs.promises.unlink(filePath);

    return transactionsStored;
  }
}

export default ImportTransactionsService;
