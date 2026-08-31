import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Reflex Delivery Management API',
    version: '1.0.0',
    description: 'API documentation for the Reflex delivery management MVP.',
  },

  servers: [
    {
      url: process.env.API_URL ||'http://localhost:5000',
      description: 'Local development server',
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token',
      },
    },

    schemas: {
      Delivery: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reference_number: { type: 'string', example: 'REF-945599' },
          retailer_id: { type: 'string', format: 'uuid' },
          rider_id: { type: 'string', format: 'uuid', nullable: true },
          customer_name: { type: 'string', example: 'Jane Wambui' },
          customer_phone: { type: 'string', example: '0711223344' },
          delivery_address: { type: 'string', example: 'Juja, Stage 4, Plaza Block B' },
          item_description: { type: 'string', example: 'Pharmacy Pack - Asthma Inhaler' },
          status: {
            type: 'string',
            enum: ['Pending', 'Assigned', 'Picked Up', 'Delivered', 'Cancelled'],
          },
          payment_confirmed: { type: 'boolean', example: true },
        },
      },

      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          full_name: { type: 'string', example: 'David Makori' },
          email: {
            type: 'string',
            format: 'email',
            example: 'david.makori@reflex.co.ke',
          },
          role: {
            type: 'string',
            enum: ['retailer', 'rider'],
          },
          live_status: {
            type: 'string',
            enum: ['Available', 'In Transit', 'Offline'],
          },
        },
      },

      CreateDeliveryRequest: {
        type: 'object',
        required: ['customer_name', 'customer_phone', 'delivery_address', 'item_description'],
        properties: {
          customer_name: { type: 'string', example: 'Jane Wambui' },
          customer_phone: { type: 'string', example: '0711223344' },
          delivery_address: { type: 'string', example: 'Juja, Stage 4, Plaza Block B' },
          item_description: { type: 'string', example: 'Pharmacy Pack - Asthma Inhaler' },
          payment_confirmed: { type: 'boolean', example: true },
        },
      },

      RiderStatusUpdate: {
        type: 'object',
        required: ['new_status'],
        properties: {
          new_status: {
            type: 'string',
            enum: ['Available', 'Offline'],
            example: 'Available',
            description: 'The rider duty status.',
          },
        },
      },
    },
  },

  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
