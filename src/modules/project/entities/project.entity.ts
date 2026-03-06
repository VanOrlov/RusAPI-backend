import { User } from 'src/entities/user/user.entity';
import { Resource } from 'src/modules/resource/entities/resource.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Короткий ID для ссылок (например, "Vx9_k2mP")
  @Column({ unique: true, length: 15 })
  nanoId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Связь с юзером. Удаляем юзера -> каскадно удаляются все его проекты
  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
  user: User;

  // Связь с ресурсами. Один проект -> много эндпоинтов
  @OneToMany(() => Resource, (resource) => resource.project)
  resources: Resource[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
