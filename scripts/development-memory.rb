#!/usr/bin/env ruby
# frozen_string_literal: true

# Optional development support. Production course builds do not load this file.
ENV['BUNDLE_GEMFILE'] = File.expand_path('mcp-client/Gemfile', __dir__)
ENV['BUNDLE_FROZEN'] = 'true'
require 'bundler/setup'
require 'base64'
require 'digest'
require 'json'
require 'optparse'
require 'pathname'
require 'uri'
require 'json_schemer'
require 'mcp'
require 'faraday'

module DevelopmentMemory
  class Error < StandardError; end

  PROTOCOL = '2026-07-28'
  TASKS = 'io.modelcontextprotocol/tasks'
  DEFAULT_URL = 'http://concurrent_development_mcp.local/mcp'
  MAX_CONTENT = 2 * 1024 * 1024
  MAX_PRINT = 128 * 1024
  READ_TOOLS = %w[repository_list development_search development_artifact_list
                  development_artifact_get development_artifact_content_get
                  skill_list skill_get skill_asset_get].freeze
  LIST_TOOLS = {'artifacts' => 'development_artifact_list', 'skills' => 'skill_list',
                'repositories' => 'repository_list'}.freeze

  def self.sha256(bytes)
    "sha256:#{Digest::SHA256.hexdigest(bytes)}"
  end

  def self.require_digest(value)
    raise Error, 'Expected sha256:<64 lowercase hexadecimal digits>' unless value.is_a?(String) && value.match?(/\Asha256:[0-9a-f]{64}\z/)
    value
  end

  # SDK owns discovery, MCP envelopes, HTTP, JSON-RPC and response decoding.
  class SDK
    def initialize(url: DEFAULT_URL, client: nil, transport: nil)
      uri = URI.parse(url)
      unless %w[http https].include?(uri.scheme) && uri.host && !uri.userinfo && !uri.query && !uri.fragment
        raise Error, 'MCP URL must be an HTTP(S) endpoint without credentials, query or fragment'
      end
      @transport = transport || (client.nil? && MCP::Client::HTTP.new(
        url: url, max_message_bytes: 32 * 1024 * 1024, max_reconnection_wait: 10
      ) do |connection|
        connection.options.open_timeout = 10
        connection.options.timeout = 30
        connection.builder.delete(Faraday::Response::RaiseError)
      end)
      @client = client || MCP::Client.new(transport: @transport, max_pages: 20)
      @client.connect(protocol_version: PROTOCOL, mode: :modern,
                      client_info: {name: 'learn-llm-development-memory-reader', version: '1'},
                      capabilities: {extensions: {TASKS => {}}})
      unless @client.protocol_version == PROTOCOL && @client.server_capabilities&.dig('extensions', TASKS).is_a?(Hash)
        raise Error, 'MCP server must support 2026-07-28 and the io.modelcontextprotocol/tasks extension'
      end
      @tools = @client.tools.to_h { |tool| [tool.name, tool] }
    rescue StandardError
      close
      raise
    end

    def call(name, arguments)
      raise Error, 'Only allowlisted read tools are supported' unless READ_TOOLS.include?(name)
      tool = @tools[name]
      unless tool && tool.annotations&.fetch('readOnlyHint', nil) == true && tool.input_schema.is_a?(Hash) && tool.output_schema.is_a?(Hash)
        raise Error, "#{name} must advertise read-only input/output schemas"
      end
      validate_schema(tool.input_schema, arguments, 'request')
      response = @client.call_tool(name: name, arguments: arguments)
      raise Error, 'Malformed MCP read envelope' unless response.is_a?(Hash)
      if response.key?('error')
        code = response['error'].is_a?(Hash) ? response['error']['code'] : nil
        if code == -32003
          raise Error, 'MCP rejected required client capability; this reader requires the Tasks extension'
        end
        raise Error, "MCP protocol error #{code}"
      end
      result = response.fetch('result')
      unless result.is_a?(Hash) && result['resultType'] == 'complete' && result['isError'] == false && result['structuredContent'].is_a?(Hash)
        raise Error, 'Read query must return a complete successful structured result'
      end
      structured = result['structuredContent']
      validate_schema(tool.output_schema, structured, 'response')
      unless structured['status'] == 'ok'
        raise Error, "MCP read returned #{structured['status']}: #{structured.dig('data', 'code')}"
      end
      structured.fetch('data')
    rescue KeyError, TypeError => error
      raise Error, "Malformed MCP read envelope (#{error.class})"
    end

    def close
      @transport.close if @transport && @transport.respond_to?(:close)
    end

    private

    def validate_schema(schema, value, label)
      issue = JSONSchemer.schema(schema, ref_resolver: ->(_) { raise Error, 'External schema references are not supported' }).validate(value).first
      raise Error, "MCP #{label} does not match advertised schema at #{issue['data_pointer']}" if issue
    end
  end

  class Reader
    def initialize(sdk)
      @sdk = sdk
    end

    def query(tool, arguments)
      arguments = arguments.dup
      arguments['limit'] ||= 20
      unless arguments['limit'].is_a?(Integer) && (1..50).cover?(arguments['limit'])
        raise Error, 'Query limit must be 1..50; paginate explicitly'
      end
      page = data(tool, arguments, 'page')
      unless page['items'].is_a?(Array) && [true, false].include?(page['has_more'])
        raise Error, 'Query must return a typed result page'
      end
      {'page' => page}
    end

    def artifact(id:, observation:, expected_sha: nil)
      args = {'artifact_id' => id, 'observation_id' => observation}
      view = data('development_artifact_get', args, 'artifact')
      metadata = view['artifact']
      raise Error, 'Artifact query returned an unexpected response kind' unless metadata.is_a?(Hash)
      unless metadata['artifact_id'] == id && metadata['observation_id'] == observation
        raise Error, 'Artifact response does not match requested ID and immutable observation'
      end
      content = data('development_artifact_content_get', args, 'content')
      raise Error, 'Artifact content ID mismatch' unless content['artifact_id'] == id
      %w[encoding media_type content_sha256 byte_size].each do |field|
        raise Error, "Artifact metadata/content #{field} mismatch" unless metadata[field] == content[field]
      end
      bytes = decode(content, expected_sha: expected_sha)
      [bytes, {'artifact_id' => id, 'observation_id' => observation,
               **content.slice('encoding', 'media_type', 'content_sha256', 'byte_size')}]
    end

    def skill(scope:, name:, revision:)
      args = {'scope' => scope, 'name' => name}
      args['revision'] = revision unless revision.nil?
      skill = data('skill_get', args, 'skill')
      unless skill['scope'] == scope && skill['name'] == name && (revision.nil? || skill['revision'] == revision)
        raise Error, 'Skill response does not match requested scope, name and revision'
      end
      DevelopmentMemory.require_digest(skill.fetch('content_digest'))
      instructions = utf8(skill.fetch('instructions'))
      raise Error, 'Skill instructions exceed content limit' if instructions.bytesize > MAX_CONTENT
      skill
    end

    def instructions(scope:, name:, revision:, expected_sha:)
      skill = skill(scope: scope, name: name, revision: revision)
      bytes = utf8(skill.fetch('instructions'))
      # content_digest covers the complete snapshot, including asset bodies.
      # The caller supplies the instruction-file digest from its pinned manifest.
      check_expected(bytes, expected_sha)
      [bytes, {'scope' => scope, 'name' => name, 'revision' => revision,
               'content_sha256' => DevelopmentMemory.sha256(bytes), 'byte_size' => bytes.bytesize,
               'encoding' => 'utf-8', 'media_type' => 'text/markdown',
               'snapshot_content_digest' => skill.fetch('content_digest')}]
    end

    def asset(scope:, name:, revision:, path:, expected_sha: nil)
      skill = skill(scope: scope, name: name, revision: revision)
      manifest = skill.fetch('assets').select { |item| item['path'] == path }
      raise Error, 'Requested path must appear exactly once in pinned skill manifest' unless manifest.length == 1
      content = data('skill_asset_get', {'scope' => scope, 'name' => name, 'revision' => revision, 'path' => path}, 'asset')
      {'scope' => scope, 'name' => name, 'revision' => revision, 'path' => path, 'skill_id' => skill.fetch('skill_id')}.each do |field, value|
        raise Error, "Skill asset #{field} mismatch" unless content[field] == value
      end
      %w[media_type executable content_sha256 byte_size].each do |field|
        raise Error, "Skill asset manifest #{field} mismatch" unless manifest.first[field] == content[field]
      end
      unless content.dig('published', 'event', 'event_id') == skill.dig('published', 'event', 'event_id')
        raise Error, 'Skill asset publication identity mismatch'
      end
      bytes = decode(content, expected_sha: expected_sha)
      [bytes, {'scope' => scope, 'name' => name, 'revision' => revision, 'path' => path,
               **content.slice('encoding', 'media_type', 'content_sha256', 'byte_size'),
               'stored_executable' => content.fetch('executable')}]
    end

    private

    def data(tool, arguments, expected_kind)
      value = @sdk.call(tool, arguments)
      unless value.is_a?(Hash) && value.keys == [expected_kind] && value[expected_kind].is_a?(Hash)
        raise Error, "#{tool} returned an unexpected response kind"
      end
      value[expected_kind]
    end

    def utf8(value)
      raise Error, 'Content must be an exact valid UTF8 string' unless value.is_a?(String)
      bytes = value.dup.force_encoding(Encoding::UTF_8)
      raise Error, 'Content is not valid UTF8' unless bytes.valid_encoding?
      bytes.b
    end

    def check_expected(bytes, expected)
      return if expected.nil?
      DevelopmentMemory.require_digest(expected)
      raise Error, 'Content does not match caller-pinned SHA256' unless DevelopmentMemory.sha256(bytes) == expected
    end

    def decode(content, expected_sha:)
      encoding = content.fetch('encoding')
      if encoding == 'utf-8'
        raise Error, 'UTF8 content cannot contain a binary payload' if content.key?('base64')
        bytes = utf8(content.fetch('text'))
      elsif encoding == 'binary'
        raise Error, 'Binary content cannot contain a text payload' if content.key?('text')
        bytes = Base64.strict_decode64(content.fetch('base64'))
        raise Error, 'Binary Base64 must be canonical' unless Base64.strict_encode64(bytes) == content['base64']
      else
        raise Error, 'Unsupported content encoding'
      end
      DevelopmentMemory.require_digest(content.fetch('content_sha256'))
      unless content['media_type'].is_a?(String) && content['media_type'].match?(/\A[\x21-\x7e]{1,255}\z/)
        raise Error, 'Invalid content media type'
      end
      unless content['byte_size'].is_a?(Integer) && bytes.bytesize == content['byte_size'] && bytes.bytesize <= MAX_CONTENT
        raise Error, 'Content byte length mismatch or limit exceeded'
      end
      raise Error, 'Content SHA256 mismatch' unless DevelopmentMemory.sha256(bytes) == content['content_sha256']
      check_expected(bytes, expected_sha)
      bytes
    rescue ArgumentError => error
      raise Error, "Invalid binary content (#{error.class})"
    end
  end

  module Files
    module_function

    def path(value)
      raise Error, 'File path is required' unless value.is_a?(String) && !value.empty? && !value.include?("\0")
      raise Error, 'Parent traversal is not permitted in file paths' if value.split(File::SEPARATOR).include?('..')
      absolute = File.expand_path(value)
      current = File::SEPARATOR
      Pathname.new(File.dirname(absolute)).each_filename do |part|
        current = File.join(current, part)
        info = File.lstat(current)
        raise Error, 'File ancestors must be existing directories without symlinks' unless info.directory? && !info.symlink?
      end
      absolute
    end

    def query(value)
      absolute = path(value)
      info = File.lstat(absolute)
      raise Error, 'Query must be a regular file without symlinks, at most 64 KiB' unless info.file? && !info.symlink? && info.size <= 64 * 1024
      text = File.binread(absolute).force_encoding(Encoding::UTF_8)
      raise Error, 'Query must be valid UTF8' unless text.valid_encoding?
      result = JSON.parse(text)
      raise Error, 'Query JSON must be an object' unless result.is_a?(Hash)
      result
    end

    def destination(value)
      absolute = path(value)
      begin
        File.lstat(absolute)
      rescue Errno::ENOENT
        return absolute
      end
      raise Error, 'Output already exists; symlinks and nonregular outputs are also refused'
    end

    def write(value, bytes)
      absolute = destination(value)
      flags = File::WRONLY | File::CREAT | File::EXCL | File::NOFOLLOW
      created_identity = nil
      File.open(absolute, flags, 0o600) do |file|
        created_identity = [file.stat.dev, file.stat.ino]
        raise Error, 'Output must be a regular file' unless file.stat.file?
        raise Error, 'Incomplete output write' unless file.write(bytes) == bytes.bytesize
        file.flush
        file.fsync
      end
      absolute
    rescue StandardError
      if created_identity
        begin
          info = File.lstat(absolute)
          File.unlink(absolute) if [info.dev, info.ino] == created_identity && !info.symlink?
        rescue Errno::ENOENT
          nil
        end
      end
      raise
    end
  end

  class CLI
    def self.run(argv, stdout: $stdout, stderr: $stderr, sdk_factory: ->(url) { SDK.new(url: url) })
      options = {}
      parser = OptionParser.new do |flags|
        flags.banner = 'Usage: development-memory.rb list ENTITY|search|artifact get|skill get|skill discover|skill asset [options]'
        %w[url query id observation scope name path out sha256].each do |name|
          flags.on("--#{name} VALUE") do |value|
            raise Error, "Repeated option --#{name}" if options.key?(name)
            options[name] = value
          end
        end
        flags.on('--revision INTEGER', Integer) do |value|
          raise Error, 'Repeated option --revision' if options.key?('revision')
          options['revision'] = value
        end
        flags.on('--help') { stdout.puts(flags); return 0 }
      end
      args = argv.dup
      parser.parse!(args)
      action = args.join(' ')
      required, permitted = case action
      when /\Alist (artifacts|skills|repositories)\z/, 'search' then [%w[query], %w[query]]
      when 'artifact get' then [%w[id observation out], %w[id observation out sha256]]
      when 'skill get' then [%w[scope name revision out sha256], %w[scope name revision out sha256]]
      when 'skill discover' then [%w[scope name], %w[scope name]]
      when 'skill asset' then [%w[scope name revision path out], %w[scope name revision path out sha256]]
      else raise Error, parser.banner
      end
      missing = required.reject { |key| options.key?(key) && options[key] != '' }
      raise Error, "Missing options: #{missing.map { |key| "--#{key}" }.join(', ')}" unless missing.empty?
      extras = options.keys - permitted - ['url']
      raise Error, "Unsupported options for #{action}: #{extras.join(', ')}" unless extras.empty?
      raise Error, 'Revision must be a positive integer' if options.key?('revision') && options['revision'] < 1
      DevelopmentMemory.require_digest(options['sha256']) if options['sha256']
      Files.destination(options['out']) if options['out']
      query = Files.query(options['query']) if options['query']
      sdk = sdk_factory.call(options.fetch('url', DEFAULT_URL))
      reader = Reader.new(sdk)
      result = case action
      when /\Alist (artifacts|skills|repositories)\z/
        reader.query(LIST_TOOLS.fetch(action.split.last), query)
      when 'search'
        reader.query('development_search', query)
      when 'skill discover'
        skill = reader.skill(scope: options['scope'], name: options['name'], revision: nil)
        skill.slice('skill_id', 'name', 'scope', 'revision', 'description', 'assets', 'content_digest')
      else
        bytes, metadata = case action
        when 'artifact get'
          reader.artifact(id: options['id'], observation: options['observation'], expected_sha: options['sha256'])
        when 'skill get'
          reader.instructions(scope: options['scope'], name: options['name'], revision: options['revision'], expected_sha: options['sha256'])
        when 'skill asset'
          reader.asset(scope: options['scope'], name: options['name'], revision: options['revision'], path: options['path'], expected_sha: options['sha256'])
        end
        metadata.merge('output' => Files.write(options['out'], bytes))
      end
      printed = JSON.generate(result)
      raise Error, 'Result exceeds stdout limit; reduce query page size' if printed.bytesize > MAX_PRINT
      stdout.puts(printed)
      0
    rescue Error, OptionParser::ParseError, JSON::ParserError, SystemCallError, URI::InvalidURIError, KeyError, TypeError => error
      stderr.puts("development-memory: #{error.message[0, 1000]}")
      1
    rescue MCP::Client::RequestHandlerError, Faraday::Error => error
      stderr.puts("development-memory: MCP connection or request failed (#{error.class}); check endpoint and server availability")
      1
    ensure
      sdk.close if sdk
    end
  end
end

exit DevelopmentMemory::CLI.run(ARGV) if $PROGRAM_NAME == __FILE__
