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
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@techcorp.com', company: 'TechCorp', status: LeadStatus.HOT, source: LeadSource.WEBSITE, value: 15000, ownerId: admin.id },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@startup.io', company: 'Startup.io', status: LeadStatus.WARM, source: LeadSource.REFERRAL, value: 8500, ownerId: user.id, assigneeId: user.id },
    { firstName: 'Carol', lastName: 'White', email: 'carol@enterprise.com', company: 'Enterprise LLC', status: LeadStatus.HOT, source: LeadSource.EMAIL_CAMPAIGN, value: 45000, ownerId: admin.id },
    { firstName: 'David', lastName: 'Brown', email: 'david@solutions.net', company: 'Solutions Net', status: LeadStatus.COLD, source: LeadSource.SOCIAL_MEDIA, value: 3200, ownerId: user.id, assigneeId: user.id },
    { firstName: 'Eva', lastName: 'Martinez', email: 'eva@global.co', company: 'Global Co', status: LeadStatus.HOT, source: LeadSource.TRADE_SHOW, value: 75000, ownerId: admin.id },
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        status: lead.status,
        source: lead.source,
        value: lead.value,
        owner: { connect: { id: lead.ownerId } },
        ...(lead.assigneeId ? { assignee: { connect: { id: lead.assigneeId } } } : {}),
      },
    });
  }

  // Create sample contacts
  const contacts = [
    { firstName: 'Michael', lastName: 'Chen', email: 'michael@nexus.com', company: 'Nexus Tech', jobTitle: 'CTO' },
    { firstName: 'Sarah', lastName: 'Williams', email: 'sarah@apex.io', company: 'Apex Solutions', jobTitle: 'CEO' },
    { firstName: 'James', lastName: 'Taylor', email: 'james@peak.co', company: 'Peak Performance', jobTitle: 'VP Sales' },
  ];

  const createdContacts = [];
  for (const contact of contacts) {
    const c = await prisma.contact.create({
      data: {
        ...contact,
        owner: { connect: { id: admin.id } },
      },
    });
    createdContacts.push(c);
  }

  // Create sample deals
  const deals = [
    { title: 'Enterprise License Deal', value: 85000, stage: DealStage.NEGOTIATION, probability: 70, contactIndex: 0 },
    { title: 'SaaS Annual Subscription', value: 24000, stage: DealStage.PROPOSAL, probability: 60, contactIndex: 1 },
    { title: 'Implementation Project', value: 45000, stage: DealStage.QUALIFICATION, probability: 40, contactIndex: 2 },
    { title: 'Consulting Retainer', value: 36000, stage: DealStage.CLOSED_WON, probability: 100, contactIndex: 0 },
  ];

  for (const deal of deals as any[]) {
    await prisma.deal.create({
      data: {
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        probability: deal.probability,
        owner: { connect: { id: admin.id } },
        contact: { connect: { id: createdContacts[deal.contactIndex].id } },
      },
    });
  }

  // Seed the product used in the Products page screenshot so it is available immediately.
  const productConfigs = [
    { category: 'SSC', groupName: 'SCC', productName: 'Self Compacting Concrete', value: 150000 },
    { category: 'RMC', groupName: 'Concrete', productName: 'Ready Mix Concrete', value: 92000 },
    { category: 'Cement', groupName: 'Building Materials', productName: 'OPC 53 Grade', value: 420 },
    { category: 'Steel', groupName: 'Reinforcement', productName: 'TMT Bar 12mm', value: 68000 },
    { category: 'Bricks', groupName: 'Masonry', productName: 'Fly Ash Bricks', value: 7800 },
  ];

  for (const productConfig of productConfigs) {
    await prisma.productConfig.upsert({
      where: {
        category_groupName_productName: {
          category: productConfig.category,
          groupName: productConfig.groupName,
          productName: productConfig.productName,
        },
      },
      update: {
        value: productConfig.value,
        isActive: true,
      },
      create: {
        category: productConfig.category,
        groupName: productConfig.groupName,
        productName: productConfig.productName,
        value: productConfig.value,
        isActive: true,
      },
    });
  }

  // Create sample tasks
  const tasks = [
    { title: 'Follow up with Alice Johnson', priority: TaskPriority.HIGH, status: TaskStatus.TODO, dueDate: new Date(Date.now() + 86400000) },
    { title: 'Prepare proposal for Enterprise LLC', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, dueDate: new Date(Date.now() + 172800000) },
    { title: 'Schedule demo call', priority: TaskPriority.MEDIUM, status: TaskStatus.COMPLETED, dueDate: new Date(Date.now() - 86400000) },
    { title: 'Update CRM records', priority: TaskPriority.LOW, status: TaskStatus.TODO, dueDate: new Date(Date.now() + 432000000) },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        owner: { connect: { id: admin.id } },
      },
    });
  }

  // Additional sample data for a more realistic dashboard
  const extraContacts = [
    { firstName: 'Priya', lastName: 'Nair', email: 'priya@infraworks.com', company: 'InfraWorks', jobTitle: 'Procurement Manager' },
    { firstName: 'Arjun', lastName: 'Reddy', email: 'arjun@buildmax.com', company: 'BuildMax', jobTitle: 'Project Head' },
    { firstName: 'Meera', lastName: 'Iyer', email: 'meera@constructpro.com', company: 'ConstructPro', jobTitle: 'Operations Lead' },
    { firstName: 'Karan', lastName: 'Shah', email: 'karan@civilcore.com', company: 'CivilCore', jobTitle: 'Director' },
    { firstName: 'Nisha', lastName: 'Patel', email: 'nisha@homeline.in', company: 'HomeLine', jobTitle: 'Sales Manager' },
  ];

  for (const contact of extraContacts) {
    await prisma.contact.create({
      data: {
        ...contact,
        owner: { connect: { id: admin.id } },
      },
    });
  }

  const extraLeads = [
    { firstName: 'Rahul', lastName: 'Kumar', email: 'rahul@skyline.com', company: 'Skyline Infra', status: LeadStatus.COLD, source: LeadSource.WEBSITE, value: 28000, ownerId: user.id, assigneeId: user.id },
    { firstName: 'Sneha', lastName: 'Gupta', email: 'sneha@metrobuild.com', company: 'MetroBuild', status: LeadStatus.WARM, source: LeadSource.REFERRAL, value: 54000, ownerId: admin.id },
    { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@alphacivil.com', company: 'Alpha Civil', status: LeadStatus.HOT, source: LeadSource.COLD_CALL, value: 98000, ownerId: user.id, assigneeId: user.id },
    { firstName: 'Ananya', lastName: 'Das', email: 'ananya@pioneerhomes.com', company: 'Pioneer Homes', status: LeadStatus.CONVERTED, source: LeadSource.TRADE_SHOW, value: 125000, ownerId: admin.id },
    { firstName: 'Deepak', lastName: 'Menon', email: 'deepak@urbanedge.com', company: 'UrbanEdge', status: LeadStatus.LOST, source: LeadSource.OTHER, value: 16000, ownerId: user.id, assigneeId: user.id },
  ];

  for (const lead of extraLeads) {
    await prisma.lead.create({
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        status: lead.status,
        source: lead.source,
        value: lead.value,
        owner: { connect: { id: lead.ownerId } },
        ...(lead.assigneeId ? { assignee: { connect: { id: lead.assigneeId } } } : {}),
      },
    });
  }

  const extraDeals = [
    { title: 'MetroBuild Supply Contract', value: 68000, stage: DealStage.PROPOSAL, probability: 55, contactIndex: 1 },
    { title: 'Alpha Civil Bulk Order', value: 112000, stage: DealStage.NEGOTIATION, probability: 75, contactIndex: 3 },
    { title: 'Pioneer Homes Annual Renewal', value: 240000, stage: DealStage.CLOSED_WON, probability: 100, contactIndex: 4 },
  ];

  for (const deal of extraDeals as any[]) {
    await prisma.deal.create({
      data: {
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        probability: deal.probability,
        owner: { connect: { id: admin.id } },
        contact: { connect: { id: createdContacts[deal.contactIndex].id } },
      },
    });
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
