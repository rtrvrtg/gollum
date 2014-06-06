# ~*~ encoding: utf-8 ~*~
module Precious
  module Helpers
    # Extract the path string that Gollum::Wiki expects
    def extract_path(file_path)
      return nil if file_path.nil?
      last_slash = file_path.rindex("/")
      if last_slash
        file_path[0, last_slash]
      end
    end

    # Extract the 'page' name from the file_path
    def extract_name(file_path)
      if file_path[-1, 1] == "/"
        return nil
      end

      # File.basename is too eager to please and will return the last
      # component of the path even if it ends with a directory separator.
      ::File.basename(file_path)
    end

    def sanitize_empty_params(param)
      [nil, ''].include?(param) ? nil : CGI.unescape(param)
    end

    # Ensure path begins with a single leading slash
    def clean_path(path)
      if path
        (path[0] != '/' ? path.insert(0, '/') : path).gsub(/\/{2,}/, '/')
      end
    end

    # Remove all slashes from the start of string.
    # Remove all double slashes
    def clean_url url
      return url if url.nil?
      url.gsub('%2F', '/').gsub(/^\/+/, '').gsub('//', '/')
    end

    # Build a URL to a CSS or JS asset
    def asset_url asset
      "#{@base_url}#{asset}"
    end

    # Build a list of assets to include
    def asset_list type, asset_library, aggregated = false
      raw_asset_list = {}
      raw_asset_list = asset_library[type] if type == :css
      raw_asset_list = asset_library[type] if type == :js

      sources = raw_asset_list.values.map { |items|
        items[:sources].map { |file|
          {
            file: asset_url(file),
            media: items[:media]
          }
        }
      }.flatten

      targets = raw_asset_list.values.map { |items|
        {
          file: asset_url(items[:target]),
          media: items[:media]
        }
      }

      output = sources
      output = targets if aggregated

      output
    end
  end
end
