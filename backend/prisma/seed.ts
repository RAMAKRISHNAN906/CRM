import { PrismaClient, Role, LeadStatus, LeadSource, DealStage, TaskPriority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const ADMIN_MODULES = JSON.stringify([
    'leads', 'contacts', 'deals', 'tasks', 'pipeline',
    'calendar', 'products', 'quotes', 'email', 'reports', 'support', 'documents',
  ]);
  const USER_MODULES = JSON.stringify([
    'leads', 'contacts', 'deals', 'tasks', 'pipeline', 'calendar', 'reports',
  ]);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: { name: 'Admin User' },
    create: {
      email: 'admin@crm.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.preference.upsert({
    where: { userId: admin.id },
    update: { selectedModules: ADMIN_MODULES, accentColor: 'violet', theme: 'dark' },
    create: { userId: admin.id, theme: 'dark', accentColor: 'violet', selectedModules: ADMIN_MODULES },
  });

  // Create regular user
  const userPassword = await bcrypt.hash('User@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@crm.com' },
    update: { name: 'John Doe' },
    create: {
      email: 'user@crm.com',
      name: 'John Doe',
      password: userPassword,
      role: Role.USER,
    },
  });

  await prisma.preference.upsert({
    where: { userId: user.id },
    update: { selectedModules: USER_MODULES, accentColor: 'blue', theme: 'dark' },
    create: { userId: user.id, theme: 'dark', accentColor: 'blue', selectedModules: USER_MODULES },
  });

  // Create sample leads
  const leads = [
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@techcorp.com', company: 'TechCorp', status: LeadStatus.QUALIFIED, source: LeadSource.WEBSITE, value: 15000 },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@startup.io', company: 'Startup.io', status: LeadStatus.CONTACTED, source: LeadSource.REFERRAL, value: 8500 },
    { firstName: 'Carol', lastName: 'White', email: 'carol@enterprise.com', company: 'Enterprise LLC', status: LeadStatus.PROPOSAL, source: LeadSource.EMAIL_CAMPAIGN, value: 45000 },
    { firstName: 'David', lastName: 'Brown', email: 'david@solutions.net', company: 'Solutions Net', status: LeadStatus.NEW, source: LeadSource.SOCIAL_MEDIA, value: 3200 },
    { firstName: 'Eva', lastName: 'Martinez', email: 'eva@global.co', company: 'Global Co', status: LeadStatus.NEGOTIATION, source: LeadSource.TRADE_SHOW, value: 75000 },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: { ...lead, userId: admin.id } });
  }

  // Create sample contacts
  const contacts = [
    { firstName: 'Michael', lastName: 'Chen', email: 'michael@nexus.com', company: 'Nexus Tech', jobTitle: 'CTO' },
    { firstName: 'Sarah', lastName: 'Williams', email: 'sarah@apex.io', company: 'Apex Solutions', jobTitle: 'CEO' },
    { firstName: 'James', lastName: 'Taylor', email: 'james@peak.co', company: 'Peak Performance', jobTitle: 'VP Sales' },
  ];

  const createdContacts = [];
  for (const contact of contacts) {
    const c = await prisma.contact.create({ data: { ...contact, userId: admin.id } });
    createdContacts.push(c);
  }

  // Create sample deals
  const deals = [
    { title: 'Enterprise License Deal', value: 85000, stage: DealStage.NEGOTIATION, probability: 70, contactId: createdContacts[0].id },
    { title: 'SaaS Annual Subscription', value: 24000, stage: DealStage.PROPOSAL, probability: 60, contactId: createdContacts[1].id },
    { title: 'Implementation Project', value: 45000, stage: DealStage.QUALIFICATION, probability: 40, contactId: createdContacts[2].id },
    { title: 'Consulting Retainer', value: 36000, stage: DealStage.CLOSED_WON, probability: 100, contactId: createdContacts[0].id },
  ];

  for (const deal of deals) {
    await prisma.deal.create({ data: { ...deal, userId: admin.id } });
  }

  // Create sample tasks
  const tasks = [
    { title: 'Follow up with Alice Johnson', priority: TaskPriority.HIGH, status: TaskStatus.TODO, dueDate: new Date(Date.now() + 86400000) },
    { title: 'Prepare proposal for Enterprise LLC', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, dueDate: new Date(Date.now() + 172800000) },
    { title: 'Schedule demo call', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, dueDate: new Date(Date.now() - 86400000) },
    { title: 'Update CRM records', priority: TaskPriority.LOW, status: TaskStatus.TODO, dueDate: new Date(Date.now() + 432000000) },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: { ...task, userId: admin.id } });
  }

  // Activity logs
  await prisma.activityLog.create({
    data: { action: 'USER_REGISTERED', entity: 'User', entityId: admin.id, userId: admin.id, details: { email: admin.email } },
  });

  console.log('✅ Seed completed!');
  console.log('');
  console.log('👤 Admin: admin@crm.com / Admin@123');
  console.log('👤 User:  user@crm.com  / User@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
