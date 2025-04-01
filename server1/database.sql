CREATE DATABASE proyectoSeguridad;

\c proyectoSeguridad;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    secret VARCHAR(255)
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    request_body TEXT,
    query_params TEXT,
    hostname VARCHAR(255),
    protocol VARCHAR(10),
    environment VARCHAR(20),
    node_version VARCHAR(20),
    process_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);