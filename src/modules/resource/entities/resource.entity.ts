import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // Название эндпоинта (например, "users")

  // Схема полей эндпоинта (сохраняем как JSON массив объектов)
  @Column({ type: 'jsonb', default: [] })
  schema: {
    name: string;
    type: `${string}.${string}`;
  }[];

  // Сгенерированные данные для эндпоинта (JSON массив)
  @Column({ type: 'jsonb', default: [] })
  data: { id: string; [k: string]: any }[];

  // Связь с проектом. Удаляем проект -> удаляются ресурсы
  @ManyToOne(() => Project, (project) => project.resources, {
    onDelete: 'CASCADE',
  })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
