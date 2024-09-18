import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';


const app = fastify({ logger: true });

// Tipos para os dados do corpo da requisição
interface Address {
    postal_code: string;
}

interface Package {
    weight: number;
    height: number;
    width: number;
    length: number;
}

interface CalculateFreteRequest {
    from: Address;
    to: Address;
    package: Package;
}

// Rota básica
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send('API de Cálculo de Frete');
});

// Rota para calcular o frete
app.post('/calcular-frete', async (request: FastifyRequest<{ Body: CalculateFreteRequest }>, reply: FastifyReply) => {
    const { from, to, package: pacote } = request.body;

    if (!from || !to || !pacote) {
        return reply.status(400).send({ error: 'Campos from, to e package são obrigatórios.' });
    }

    try {
        const response = await axios.post('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
            from: { postal_code: from.postal_code },
            to: { postal_code: to.postal_code },
            package: pacote,
            options: {
                receipt: false,
                own_hand: false
            },
            services: '1,2,3,4,7,11' // Exemplos de IDs de serviços
        }, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`, // Use variável de ambiente para a chave
                'Content-Type': 'application/json',
                'User-Agent': 'Aplicação cleber.fdelgado@gmail.com'
            }
        });

        // Log da resposta para verificar a estrutura
        console.log('Resposta da API:', response.data);

        // Verificar se a resposta contém serviços de entrega
        if (Array.isArray(response.data) && response.data.length > 0) {
            // Retornar todos os serviços disponíveis
            const opcoesFrete = response.data.map((servico: any) => ({
                empresa: servico.company.name,
                servico: servico.name,
                prazo: servico.delivery_time,
                valor: servico.price,
                id: servico.company.id
            }));

            reply.send({ opcoesFrete });
        } else {
            console.error('Resposta da API não é um array ou está vazia.');
            reply.status(500).send({ error: 'Nenhuma opção de frete disponível.' });
        }

    } catch (error: any) {
        if (error.response) {
            console.error('Erro na resposta da API:', error.response.data);
            reply.status(error.response.status).send({ error: error.response.data });
        } else if (error.request) {
            console.error('Erro na requisição à API:', error.request);
            reply.status(500).send({ error: 'Nenhuma resposta da API.' });
        } else {
            console.error('Erro desconhecido:', error.message);
            reply.status(500).send({ error: 'Erro ao calcular o frete.' });
        }
    }
});

// Inicia o servidor
const start = async () => {
    try {
        app.listen({ port: process.env.PORT ? Number(process.env.PORT) : 3000, host: '0.0.0.0' });
        app.log.info(`Servidor rodando `);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();

export default app;
