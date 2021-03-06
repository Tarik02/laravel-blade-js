/* tslint:disable:no-unused-expression */

import { expect } from 'chai';
import 'mocha';
import { createLexerFromText, lexAssert } from '../util.test';

import { Token } from '../../src/lexer/Token';

describe('lexer/Lexer', () => {
  describe('peek', () => {
    it('should return eof token when provider is empty', () => {
      const lexer = createLexerFromText('');

      expect(lexer.peek().type).eq('eof');
    });

    it('should return next token without moving', () => {
      const lexer = createLexerFromText('Hello World');

      expect(lexer.peek() === lexer.peek()).true;
    });
  });

  describe('next', () => {
    it('should return eof token when provider is empty', () => {
      const lexer = createLexerFromText('');

      for (let i = 0; i < 100; ++i) {
        expect(lexer.peek().type).eq('eof');
      }
    });

    it('should move thru tokens', () => {
      const lexer = createLexerFromText(`
Hello World
@section('a', 'b')
`.trim());

      let tok: Token;

      tok = lexer.next();
      expect(tok.type).eq('text');
      if (tok.type === 'text') {
        expect(tok.value).eq('Hello World\n');
      }

      tok = lexer.next();
      expect(tok.type).eq('function');
      if (tok.type === 'function') {
        expect(tok.name).eq('section');
        expect(tok.args).deep.eq([`'a'`, `'b'`]);
      }
    });

    it('should return first token even if peek was called before', () => {
      const lexer = createLexerFromText(`
@for(let i = 0; i < 10; ++i)
@endfor
`.trim());

      expect(lexer.peek()).deep.eq(lexer.next());
    });
  });

  describe('samples', () => {
    it('sample-1 (complex input)', () => {
      lexAssert(`
{{-- this example is taken from https://laravel.com/docs/5.8/blade#template-inheritance --}}

<!-- Stored in resources/views/layouts/app.blade.php -->

<html>
    <head>
        <title>App Name - @yield('title')</title>
    </head>
    <body>
        @section('sidebar')
            This is the master sidebar.
        @show

        <div class="container">
            @yield('content')
        </div>
    </body>
</html>
`.trim(), [
        {
          type: 'comment',
          value: ' this example is taken from https://laravel.com/docs/5.8/blade#template-inheritance ',
        },
        {
          type: 'text',
          value:
            '\n\n<!-- Stored in resources/views/layouts/app.blade.php -->' +
            '\n\n<html>\n    <head>\n        <title>App Name - '
          ,
        },
        {
          type: 'function',
          name: 'yield',
          args: [
            `'title'`,
          ],
        },
        {
          type: 'text',
          value: '</title>\n    </head>\n    <body>\n        ',
        },
        {
          type: 'function',
          name: 'section',
          args: [
            `'sidebar'`,
          ],
        },
        {
          type: 'text',
          value: '\n            This is the master sidebar.\n        ',
        },
        {
          type: 'function',
          name: 'show',
        },
        {
          type: 'text',
          value: '\n\n        <div class="container">\n            ',
        },
        {
          type: 'function',
          name: 'yield',
          args: [
            `'content'`,
          ],
        },
        {
          type: 'text',
          value: '\n        </div>\n    </body>\n</html>',
        },
      ]);
    });

    it('sample-2 (function arguments with nested braces and quotes)', () => {
      lexAssert(`
@include('view.name', {
  'foo': ['hello )))', '(( world'],
  'bar': 5 * (3 + 4 * (5 - 2)),
})
`.trim(), [
        {
          type: 'function',
          name: 'include',
          args: [
            `'view.name'`,
            `{
  'foo': ['hello )))', '(( world'],
  'bar': 5 * (3 + 4 * (5 - 2)),
}`,
          ],
        },
      ]);
    });

    it('sample-3 (\'{{ }}\' and \'{!! !!}\')', () => {
      lexAssert(`
<div>
  Username: {{ user.name }}
  Status: {{ user.status }}
  Badge: {!! user.badge !!}
</div>
`.trim(), [
        {
          type: 'text',
          value: '<div>\n  Username: ',
        },
        {
          type: 'data',
          escaped: true,
          value: 'user.name',
        },
        {
          type: 'text',
          value: '\n  Status: ',
        },
        {
          type: 'data',
          escaped: true,
          value: 'user.status',
        },
        {
          type: 'text',
          value: '\n  Badge: ',
        },
        {
          type: 'data',
          escaped: false,
          value: 'user.badge',
        },
        {
          type: 'text',
          value: '\n</div>',
        },
      ]);
    });

    it('sample-4 (escape with \'@\')', () => {
      lexAssert(`
<div>
  Username: @{{ user.name }}
  Status: @{{ user.status }}
  Badge: @{!! user.badge !!}
</div>
`.trim(), [
        {
          type: 'text',
          value:
            '<div>\n  Username: {{ user.name }}\n  Status: {{ user.status }}\n  Badge: {!! user.badge !!}\n</div>',
        },
      ]);
    });

    it('sample-5 (verbatim and js)', () => {
      lexAssert(`
@verbatim
Hello World
@endverbatim

@js
for (let i = 0; i < 10; ++i) {
  print(i);
}
@endjs

@markdown('default')

Profile info:
- Name: Bill
- Number: *+1234567890*
- Email: example@example.com

@endmarkdown
`.trim(), [
        {
          type: 'text',
          value: '\nHello World\n',
        },
        {
          type: 'text',
          value: '\n\n',
        },
        {
          type: 'raw-function',
          name: 'js',
          content: '\nfor (let i = 0; i < 10; ++i) {\n  print(i);\n}\n',
        },
        {
          type: 'text',
          value: '\n\n',
        },
        {
          type: 'raw-function',
          name: 'markdown',
          args: [`'default'`],
          content: '\n\nProfile info:\n- Name: Bill\n- Number: *+1234567890*\n- Email: example@example.com\n\n',
        },
      ], {
        rawFunctions: ['verbatim', 'js', 'markdown'],
      });
    });

    it('sample-6 (filters)', () => {
      lexAssert(`
{{ 'test' | ucfirst }}
{{ 'hello' | ucfirst | uclast }}
{{ ' HeLlO ' | trim }}
{{ name | ucfirst | substr:0,1 }}
{!! time | format-time:'Y-m-d H:i:s' !!}
`.trim(), [
        {
          type: 'data',
          escaped: true,
          value: '\'test\'',
          filters: [
            { name: 'ucfirst', args: [] },
          ],
        },
        {
          type: 'text',
          value: '\n',
        },
        {
          type: 'data',
          escaped: true,
          value: '\'hello\'',
          filters: [
            { name: 'ucfirst', args: [] },
            { name: 'uclast', args: [] },
          ],
        },
        {
          type: 'text',
          value: '\n',
        },
        {
          type: 'data',
          escaped: true,
          value: '\' HeLlO \'',
          filters: [
            { name: 'trim', args: [] },
          ],
        },
        {
          type: 'text',
          value: '\n',
        },
        {
          type: 'data',
          escaped: true,
          value: 'name',
          filters: [
            { name: 'ucfirst', args: [] },
            { name: 'substr', args: ['0', '1'] },
          ],
        },
        {
          type: 'text',
          value: '\n',
        },
        {
          type: 'data',
          escaped: false,
          value: 'time',
          filters: [
            { name: 'format-time', args: ['\'Y-m-d H:i:s\''] },
          ],
        },
      ]);
    });
  });
});
