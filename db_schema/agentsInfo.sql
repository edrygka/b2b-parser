CREATE TABLE agentsInfo(
  id serial PRIMARY KEY,
  agentId VARCHAR (10) UNIQUE NOT NULL,
  name VARCHAR (50) NOT NULL,
  phone VARCHAR (20) NOT NULL,
  city VARCHAR (50),
  rang VARCHAR (100),
  oborot VARCHAR (20),
  ownInvests VARCHAR (20),
  lastDateBuy VARCHAR (20),
  clientInvests VARCHAR (20),
  agents1Level VARCHAR (20),
  agentsInNetwork VARCHAR (20),
  oborotInMonth VARCHAR (20),
  hashsum VARCHAR (50)
);